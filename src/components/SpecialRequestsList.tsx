'use client'

import { useEffect, useRef, useState } from 'react'
import { SpecialRequestCard } from './SpecialRequestCard'
import { Toast } from './Toast'
import { useTranslations } from './TranslationsProvider'

export interface SpecialRequestItem {
  id: string | number
  request: string
  registrationNumber?: string | null
  createdAt: string
  sortOrder?: number
  showOnSlide?: boolean
}

interface SpecialRequestsListProps {
  requests: ReadonlyArray<SpecialRequestItem>
  onEdit: (request: { id: string | number; request: string; registrationNumber?: string | null }) => void
  onDelete: (id: string | number) => void
  deletingId?: string | number | null
}

export function SpecialRequestsList({
  requests,
  onEdit,
  onDelete,
  deletingId,
}: SpecialRequestsListProps) {
  const { t } = useTranslations()
  const [items, setItems] = useState<SpecialRequestItem[]>([...requests])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [error, setError] = useState('')
  // Snapshot to revert to if a persist call fails.
  const lastGood = useRef<SpecialRequestItem[]>([...requests])
  // Number of in-flight mutations — while > 0 we keep our optimistic state and
  // ignore server resyncs (a router.refresh() could otherwise deliver stale data
  // before our PATCH commits and silently revert the UI).
  const pending = useRef(0)

  // Re-sync when the server data changes (add / edit / delete refreshes the page).
  useEffect(() => {
    if (pending.current > 0) return
    setItems([...requests])
    lastGood.current = [...requests]
  }, [requests])

  const persistOrder = async (ordered: SpecialRequestItem[]) => {
    pending.current += 1
    try {
      const res = await fetch('/api/special-requests/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: ordered.map((i) => i.id) }),
      })
      if (!res.ok) throw new Error('reorder failed')
      lastGood.current = ordered
    } catch {
      setItems(lastGood.current)
      setError(t('login', 'errorOccurred'))
    } finally {
      pending.current -= 1
    }
  }

  const handleDrop = () => {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    const reordered = [...items]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(overIndex, 0, moved)
    setItems(reordered)
    setDragIndex(null)
    setOverIndex(null)
    void persistOrder(reordered)
  }

  const handleToggleSlide = async (id: string | number) => {
    const target = items.find((i) => i.id === id)
    if (!target) return
    const next = !target.showOnSlide
    const optimistic = items.map((i) => ({ ...i, showOnSlide: i.id === id ? next : false }))
    setItems(optimistic)
    pending.current += 1
    try {
      const res = await fetch(`/api/special-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ showOnSlide: next }),
      })
      if (!res.ok) throw new Error('toggle failed')
      lastGood.current = optimistic
    } catch {
      setItems(lastGood.current)
      setError(t('login', 'errorOccurred'))
    } finally {
      pending.current -= 1
    }
  }

  return (
    <>
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      <div className="space-y-3">
        {items.map((request, index) => (
          <div
            key={request.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnter={() => setOverIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onDragEnd={() => {
              setDragIndex(null)
              setOverIndex(null)
            }}
            className={`rounded-xl transition-opacity ${dragIndex === index ? 'opacity-40' : ''} ${
              overIndex === index && dragIndex !== null && dragIndex !== index
                ? 'ring-2 ring-brand/45'
                : ''
            }`}
          >
            <SpecialRequestCard
              request={request}
              showActions
              showDragHandle
              isOnSlide={!!request.showOnSlide}
              onToggleSlide={handleToggleSlide}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={deletingId === request.id}
            />
          </div>
        ))}
      </div>
    </>
  )
}
