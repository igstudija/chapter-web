'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewSpecialRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const request = formData.get('request') as string
    const registrationNumber = formData.get('registrationNumber') as string
    const chapterOnly = formData.get('chapterOnly') === 'on'

    try {
      const res = await fetch('/api/special-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request, registrationNumber, chapterOnly }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create request')
      }

      router.push('/members')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-neutral-50 dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm mb-6">
          <Link href="/" className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            Home
          </Link>
          <span className="mx-2 text-neutral-400">›</span>
          <Link href="/members" className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            Profile
          </Link>
          <span className="mx-2 text-neutral-400">›</span>
          <span className="text-ink dark:text-surface-text">New Special Request</span>
        </nav>

        <div className="panel p-6">
          <h1 className="display-2 mb-6 text-ink dark:text-surface-text">Add Special Request</h1>

          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="request" className="block text-sm font-medium text-brand mb-1">
                Request Content *
              </label>
              <textarea
                id="request"
                name="request"
                required
                rows={4}
                className="field"
                placeholder="Describe what you are looking for..."
              />
            </div>

            <div>
              <label
                htmlFor="registrationNumber"
                className="block text-sm font-medium text-brand mb-1"
              >
                Reg. Nr.
              </label>
              <input
                type="text"
                id="registrationNumber"
                name="registrationNumber"
                className="field"
                placeholder="Company registration number (if applicable)"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                (Enter if the request contains a company name)
              </p>
            </div>

            {/* Unticked, this request travels to linked chapters with the
                contact details that make it actionable (ADR 0007). */}
            <div>
              <label htmlFor="chapterOnly" className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" id="chapterOnly" name="chapterOnly" className="mt-0.5" />
                <span className="text-sm text-brand">Available only to members of our chapter</span>
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-6">
                Leave this unticked and the request is offered to the chapters we are linked to,
                along with your name, company, phone and email.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'SAVING...' : 'SAVE'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
