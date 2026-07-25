'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewTop40Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/top40', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactPerson: formData.get('contactPerson'),
          position: formData.get('position'),
          companyName: formData.get('companyName'),
          registrationNumber: formData.get('registrationNumber'),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create entry')
      }

      router.push('/members/my-top40')
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
          <span className="text-ink dark:text-surface-text">New Top40 Entry</span>
        </nav>

        <div className="bg-white dark:bg-surface-raised rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-6">Add Top40 Entry</h1>

          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="contactPerson"
                className="block text-sm font-medium text-brand mb-1"
              >
                Contact Person *
              </label>
              <input
                type="text"
                id="contactPerson"
                name="contactPerson"
                required
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                placeholder="Full name"
              />
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium text-brand mb-1">
                Position *
              </label>
              <input
                type="text"
                id="position"
                name="position"
                required
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                placeholder="Job title"
              />
            </div>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-brand mb-1">
                Company Name *
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                required
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                placeholder="Company name"
              />
            </div>

            <div>
              <label
                htmlFor="registrationNumber"
                className="block text-sm font-medium text-brand mb-1"
              >
                Company Registration Number
              </label>
              <input
                type="text"
                id="registrationNumber"
                name="registrationNumber"
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                placeholder="Registration number"
              />
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
