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
    const title = formData.get('title') as string
    const registrationNumber = formData.get('registrationNumber') as string

    try {
      const res = await fetch('/api/special-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, registrationNumber }),
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

        <div className="bg-white dark:bg-surface-raised rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-6">Add Special Request</h1>

          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-brand mb-1">
                Request Content *
              </label>
              <textarea
                id="title"
                name="title"
                required
                rows={4}
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
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
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                placeholder="Company registration number (if applicable)"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                (Enter if the request contains a company name)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'SAVING...' : 'SAVE'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
