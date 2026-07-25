import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import OpenAI from 'openai'
import config from '@/payload.config'
import { isUserActive, type UserWithContext } from '@/lib/userHelpers'
import { isSessionValidForCurrentSite } from '@/lib/validateSessionSite'
import { getSiteFromHost } from '@/lib/getSiteFromHost'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rateLimit'
import { buildSystemPrompt } from '@/lib/aiContext'
import { AI_TOOLS, executeToolCall } from '@/lib/aiTools'
import { calculateTokenCost, MODEL_PRICING, REASONING_MODELS } from '@/lib/aiPricing'

const ALLOWED_MODELS = Object.keys(MODEL_PRICING)

const MAX_TOOL_ITERATIONS = 5
const MAX_HISTORY_MESSAGES = 10
const MAX_MESSAGE_LENGTH = 2000

interface ModelConfig {
  model: string
  max_tokens?: number
  max_completion_tokens?: number
  temperature?: number
}

interface UsageAccumulator {
  promptTokens: number
  completionTokens: number
}

/**
 * Non-streaming tool calling loop.
 * AI calls tools → we execute DB queries → feed results back → repeat.
 * Returns text content if AI responded with text (no more tool calls).
 */
async function runToolCallingLoop(
  openai: OpenAI,
  modelConfig: ModelConfig,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  ctx: {
    payload: Awaited<ReturnType<typeof getPayload>>
    siteId: string | number
    usage: UsageAccumulator
  },
): Promise<string | null> {
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await openai.chat.completions.create({
      ...modelConfig,
      tools: AI_TOOLS,
      messages,
    })

    if (response.usage) {
      ctx.usage.promptTokens += response.usage.prompt_tokens
      ctx.usage.completionTokens += response.usage.completion_tokens
    }

    const choice = response.choices[0]
    if (!choice) return null

    const assistantMessage = choice.message

    // No tool calls — AI has a text response
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return assistantMessage.content || null
    }

    // Notify frontend that we're searching
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'searching' })}\n\n`))

    // Add assistant message with tool calls
    messages.push(assistantMessage)

    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type !== 'function') continue

      let args: Record<string, any> = {}
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch {
        // Malformed JSON from AI
      }

      const result = await executeToolCall(toolCall.function.name, args, ctx.payload, ctx.siteId)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }

  return null
}

/**
 * Stream the final text response after tool calls are resolved.
 * Uses tool_choice: 'none' to force text-only output.
 */
async function streamFinalResponse(
  openai: OpenAI,
  modelConfig: ModelConfig,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  usage: UsageAccumulator,
): Promise<void> {
  const stream = await openai.chat.completions.create({
    ...modelConfig,
    tools: AI_TOOLS,
    tool_choice: 'none',
    stream: true,
    stream_options: { include_usage: true },
    messages,
  })

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
    }
    if (chunk.usage) {
      usage.promptTokens += chunk.usage.prompt_tokens
      usage.completionTokens += chunk.usage.completion_tokens
    }
  }
}

/**
 * Parse and validate chat input. Returns sanitized message and history, or a NextResponse error.
 */
async function parseAndValidateInput(
  request: Request,
): Promise<
  { message: string; history: OpenAI.Chat.Completions.ChatCompletionMessageParam[]; modelOverride?: string } | NextResponse
> {
  const body = await request.json()
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 },
    )
  }

  const sanitizedMessage = message.replaceAll(/<[^>]*>/g, '')

  // Validate model override
  const modelOverride = typeof body.model === 'string' && ALLOWED_MODELS.includes(body.model)
    ? body.model
    : undefined

  const rawHistory = Array.isArray(body.history) ? body.history : []
  const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = rawHistory
    .slice(-MAX_HISTORY_MESSAGES)
    .filter(
      (msg: any) =>
        msg && typeof msg.content === 'string' && (msg.role === 'user' || msg.role === 'assistant'),
    )
    .map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content.replaceAll(/<[^>]*>/g, '').slice(0, MAX_MESSAGE_LENGTH),
    }))

  return { message: sanitizedMessage, history, modelOverride }
}

/**
 * Check credit balance for non-superadmin users.
 * Returns membership and balance, or a NextResponse error.
 */
async function checkCreditBalance(
  payload: Awaited<ReturnType<typeof getPayload>>,
  userId: string | number,
  siteId: string | number,
): Promise<{ membership: any; balance: number } | NextResponse> {
  const membershipResult = await payload.find({
    collection: 'site-memberships',
    where: {
      and: [{ user: { equals: userId } }, { site: { equals: siteId } }],
    },
    limit: 1,
    depth: 0,
  })
  const membership = membershipResult.docs[0]

  if (!membership) {
    return NextResponse.json({ error: 'Membership not found' }, { status: 403 })
  }

  const balance = (membership as any).aiCreditBalanceUsd ?? 0
  if (balance <= 0) {
    return NextResponse.json({ error: 'insufficient_credit', balance }, { status: 402 })
  }

  return { membership, balance }
}

/**
 * POST /api/chat
 *
 * AI Chat endpoint with OpenAI tool calling + SSE streaming.
 *
 * Flow:
 * 1. Auth & access checks
 * 2. Build system prompt (lean — no data dump)
 * 3. Tool calling loop (non-streaming): AI calls tools → DB queries → results back to AI
 * 4. Final response (streaming): AI generates text answer based on tool results
 *
 * SSE events:
 * - data: {"status":"searching"} — during tool execution
 * - data: {"content":"..."} — streaming text
 * - data: [DONE] — end of stream
 */
export async function POST(request: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  // 1. Auth check
  if (!user || !isUserActive(user as UserWithContext)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Session site validation
  const host = headers.get('host')
  const isValidSession = await isSessionValidForCurrentSite(user, host)
  if (!isValidSession) {
    return NextResponse.json(
      { error: 'Session invalid for this site. Please log in again.' },
      { status: 401 },
    )
  }

  // 3. Role check - member-admin or superadmin only
  const userWithContext = user as UserWithContext
  if (!userWithContext.isSuperadmin && userWithContext.currentRole !== 'member-admin') {
    return NextResponse.json(
      { error: 'Access denied. Only chapter administrators can use the AI assistant.' },
      { status: 403 },
    )
  }

  // 4. Rate limiting (per user ID + IP)
  const clientIp = getClientIp(headers)
  const rateLimitKey = `${String(user.id)}:${clientIp}`
  const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.AI_CHAT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimitResult.retryAfter || 60) },
      },
    )
  }

  try {
    // Parse and validate input
    const inputResult = await parseAndValidateInput(request)
    if (inputResult instanceof NextResponse) return inputResult
    const { message: sanitizedMessage, history, modelOverride } = inputResult

    // 5. Get current site
    const currentSite = await getSiteFromHost(host)
    if (!currentSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 400 })
    }

    // 5b. Check if AI chat is enabled for this site
    if (!currentSite.enableAiChat) {
      return NextResponse.json({ error: 'AI chat is not enabled for this site.' }, { status: 403 })
    }

    // 6. Top40 count check (>= 40 entries)
    const top40Data = await payload.find({
      collection: 'top40',
      where: {
        and: [{ submittedBy: { equals: user.id } }, { site: { equals: currentSite.id } }],
      },
      limit: 0,
    })

    if (top40Data.totalDocs < 40) {
      return NextResponse.json(
        {
          error: 'top40_incomplete',
          message: 'You need to fill in your Top40 list first.',
          current: top40Data.totalDocs,
          required: 20,
        },
        { status: 403 },
      )
    }

    // 6b. Credit balance check (skip for superadmins)
    let membership: any = null
    let currentBalance = 0
    if (!userWithContext.isSuperadmin) {
      const creditResult = await checkCreditBalance(payload, user.id, currentSite.id)
      if (creditResult instanceof NextResponse) return creditResult
      membership = creditResult.membership
      currentBalance = creditResult.balance
    }

    // 7. Load AI settings
    const aiSettingsResult = await payload.find({
      collection: 'ai-settings',
      limit: 1,
    })
    const aiSettings = aiSettingsResult.docs[0]

    if (!aiSettings || !aiSettings.enabled) {
      return NextResponse.json({ error: 'AI assistant is currently disabled.' }, { status: 503 })
    }

    if (!aiSettings.openaiApiKey) {
      console.error('[AI Chat] OpenAI API key not configured')
      return NextResponse.json({ error: 'AI assistant is not configured.' }, { status: 503 })
    }

    // 8. Build lean system prompt (no data dump — tools provide data on demand)
    const systemPrompt = buildSystemPrompt(aiSettings.systemPrompt, currentSite.name)

    // 9. Create OpenAI client
    const openai = new OpenAI({ apiKey: aiSettings.openaiApiKey })

    // 10. SSE stream with tool calling loop
    const encoder = new TextEncoder()
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: sanitizedMessage },
    ]

    const selectedModel = modelOverride || aiSettings.model
    const isReasoning = REASONING_MODELS.has(selectedModel)
    const modelConfig: ModelConfig = {
      model: selectedModel,
      ...(isReasoning
        ? { max_completion_tokens: aiSettings.maxTokens }
        : { max_tokens: aiSettings.maxTokens, temperature: aiSettings.temperature }),
    }

    const readableStream = new ReadableStream({
      async start(controller) {
        const usage: UsageAccumulator = { promptTokens: 0, completionTokens: 0 }
        try {
          const textContent = await runToolCallingLoop(
            openai,
            modelConfig,
            messages,
            controller,
            encoder,
            { payload, siteId: currentSite.id, usage },
          )

          // If tool loop returned direct text, send it
          if (textContent) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: textContent })}\n\n`),
            )
          }

          // If the loop ended after tool results, stream final response
          const lastMessage = messages[messages.length - 1]
          if (lastMessage?.role === 'tool') {
            await streamFinalResponse(openai, modelConfig, messages, controller, encoder, usage)
          }

          // Calculate cost
          const cost = calculateTokenCost(
            modelConfig.model,
            usage.promptTokens,
            usage.completionTokens,
          )

          // Deduct credit (skip for superadmins)
          let newBalance = currentBalance
          if (membership && !userWithContext.isSuperadmin) {
            console.log(`[AI Chat] Usage: ${usage.promptTokens} prompt + ${usage.completionTokens} completion tokens, cost: $${cost}, balance: $${currentBalance} → $${(currentBalance - cost).toFixed(6)}`)
            if (cost > 0) {
              const updated = await payload.update({
                collection: 'site-memberships',
                id: membership.id,
                data: { aiCreditBalanceUsd: Number((currentBalance - cost).toFixed(6)) },
                depth: 0,
              })
              newBalance = (updated as any).aiCreditBalanceUsd ?? 0
            }
          }

          // Send usage info before [DONE]
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                usage: {
                  promptTokens: usage.promptTokens,
                  completionTokens: usage.completionTokens,
                  costUsd: cost,
                  balanceUsd: newBalance,
                },
              })}\n\n`,
            ),
          )

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('[AI Chat] Error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`),
          )
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 })
  }
}
