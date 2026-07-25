'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, RotateCcw, ArrowRight, ChevronDown } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  costUsd?: number
}

// avgMsgUsd = estimated cost per message in USD (assumes ~2000 prompt + ~800 completion tokens)
const MODEL_OPTIONS = [
  { value: 'gpt-4.1-nano', label: 'Nano', cost: '1x', avgMsgUsd: 0.0005 },
  { value: 'gpt-4o-mini', label: 'Mini', cost: '1x', avgMsgUsd: 0.0008 },
  { value: 'gpt-4.1-mini', label: '4.1 Mini', cost: '3x', avgMsgUsd: 0.002 },
  { value: 'o4-mini', label: 'o4-mini', cost: '7x', avgMsgUsd: 0.006 },
  { value: 'o3-mini', label: 'o3-mini', cost: '7x', avgMsgUsd: 0.006 },
  { value: 'gpt-5', label: 'GPT-5', cost: '15x', avgMsgUsd: 0.011 },
  { value: 'o3', label: 'o3', cost: '13x', avgMsgUsd: 0.01 },
  { value: 'gpt-4.1', label: 'GPT-4.1', cost: '13x', avgMsgUsd: 0.01 },
  { value: 'gpt-4o', label: 'GPT-4o', cost: '17x', avgMsgUsd: 0.013 },
]

function formatMsgCostEur(usd: number, rate: number): string {
  const eur = usd / rate
  if (eur < 0.001) return eur.toFixed(4)
  if (eur < 0.01) return eur.toFixed(3)
  return eur.toFixed(2)
}

interface ChatAccessState {
  allowed: boolean
  reason?: string
  current?: number
  required?: number
  balance?: number | null
}

export function ChatBot() {
  const { t } = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [accessState, setAccessState] = useState<ChatAccessState | null>(null)
  const [accessChecked, setAccessChecked] = useState(false)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [eurRate, setEurRate] = useState<number>(1.08) // EUR/USD fallback
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Check access when chat is first opened
  const checkAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/access')
      const data = await res.json()
      setAccessState(data)
      if (data.eurRate) setEurRate(data.eurRate)
      if (data.balance !== undefined && data.balance !== null) {
        setCreditBalance(data.balance)
      }
    } catch {
      setAccessState({ allowed: false, reason: 'error' })
    } finally {
      setAccessChecked(true)
    }
  }, [])

  useEffect(() => {
    if (isOpen && !accessChecked) {
      checkAccess()
    }
  }, [isOpen, accessChecked, checkAccess])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && accessState?.allowed) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, accessState])

  const handleSend = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmedInput }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Add placeholder for assistant response
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        if (res.status === 402) {
          setCreditBalance(errorData.balance ?? 0)
          throw new Error('insufficient_credit')
        }
        throw new Error(errorData.error || 'Failed to send message')
      }

      // Read SSE stream
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response stream')

      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break

            try {
              const parsed = JSON.parse(data)
              if (parsed.usage) {
                setCreditBalance(parsed.usage.balanceUsd)
                if (parsed.usage.costUsd !== undefined) {
                  const msgCost = parsed.usage.costUsd as number
                  setMessages((prev) => {
                    const copy = [...prev]
                    const last = copy[copy.length - 1]
                    if (last?.role === 'assistant') {
                      copy[copy.length - 1] = { ...last, costUsd: msgCost }
                    }
                    return copy
                  })
                }
              } else if (parsed.status === 'searching') {
                setIsSearching(true)
              } else if (parsed.content) {
                setIsSearching(false)
                accumulatedContent += parsed.content
                const updated = accumulatedContent
                setMessages((prev) => {
                  const copy = [...prev]
                  copy[copy.length - 1] = { role: 'assistant', content: updated }
                  return copy
                })
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }
    } catch (error) {
      let errorMessage = t('chatbot', 'error')
      if (error instanceof Error) {
        if (error.message === 'insufficient_credit') {
          errorMessage = t('chatbot', 'creditExhausted')
        } else if (error.message.includes('Too many')) {
          errorMessage = t('chatbot', 'rateLimited')
        }
      }
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: errorMessage }
        return copy
      })
    } finally {
      setIsLoading(false)
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    setMessages([])
  }

  const renderAccessDenied = () => {
    if (!accessState) return null

    if (accessState.reason === 'top40_incomplete') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-neutral-700 dark:text-neutral-200 font-medium mb-2">
            {t('chatbot', 'top40Required')}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {t('chatbot', 'top40Progress').replace(
              '{current}',
              String(accessState.current || 0),
            )}
          </p>
          <a
            href="/my-profile/my-top40"
            className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            {t('chatbot', 'goToTop40')}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )
    }

    if (accessState.reason === 'insufficient_credit') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-neutral-700 dark:text-neutral-200 font-medium mb-2">
            {t('chatbot', 'creditExhausted')}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('chatbot', 'contactAdmin')}
          </p>
        </div>
      )
    }

    if (accessState.reason === 'disabled') {
      return (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-neutral-500 dark:text-neutral-400">
            {t('chatbot', 'disabled')}
          </p>
        </div>
      )
    }

    return null
  }

  // Prevent body scroll when chat is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-60 w-14 h-14 bg-brand hover:opacity-90 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
        aria-label={isOpen ? t('chatbot', 'close') : t('chatbot', 'title')}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed top-4 bottom-4 right-4 z-60 w-3xl max-w-[calc(100vw-2rem)] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex flex-col border border-neutral-200 dark:border-neutral-700">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
                {t('chatbot', 'title')}
              </h3>
              {creditBalance !== null && (
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${creditBalance > 1 ? 'text-neutral-500 dark:text-neutral-400' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'}`}>
                  {(creditBalance / eurRate).toFixed(4)} EUR
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isLoading}
                  className="appearance-none text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1 pr-6 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} ({m.cost}) ~€{formatMsgCostEur(m.avgMsgUsd, eurRate)}/ziņa
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
              </div>
              {messages.length > 0 && (
                <button
                  onClick={handleNewChat}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded"
                  title={t('chatbot', 'newChat')}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content area */}
          {!accessChecked ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
            </div>
          ) : accessState && !accessState.allowed ? (
            renderAccessDenied()
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-sm text-neutral-400 dark:text-neutral-500 mt-8">
                    {t('chatbot', 'placeholder')}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'user' ? (
                      <div className="max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap bg-brand text-white">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="max-w-[90%] px-3 py-2 rounded-lg text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100">
                        {msg.content ? (
                          <Markdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-2">
                                  <table className="min-w-full text-sm border-collapse">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-neutral-200 dark:bg-neutral-700">{children}</thead>
                              ),
                              th: ({ children }) => (
                                <th className="px-3 py-1.5 text-left font-medium border border-neutral-300 dark:border-neutral-600">{children}</th>
                              ),
                              td: ({ children }) => (
                                <td className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-600">{children}</td>
                              ),
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                              li: ({ children }) => <li className="mb-0.5">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              h3: ({ children }) => <h3 className="font-semibold mt-2 mb-1">{children}</h3>,
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline">{children}</a>
                              ),
                            }}
                          >
                            {msg.content}
                          </Markdown>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-neutral-400">
                            <span className="animate-pulse">
                              {isSearching ? t('chatbot', 'searching') : t('chatbot', 'thinking')}
                            </span>
                          </span>
                        )}
                        {msg.costUsd !== undefined && msg.costUsd > 0 && (
                          <div className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500 text-right">
                            €{formatMsgCostEur(msg.costUsd, eurRate)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t border-neutral-200 dark:border-neutral-700 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chatbot', 'placeholder')}
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 resize-none border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none disabled:opacity-50"
                    style={{ maxHeight: '80px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="p-2 bg-brand text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
