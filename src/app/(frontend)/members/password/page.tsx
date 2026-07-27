'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match')
      setLoading(false)
      return
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/users/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change password')
      }

      setSuccess('Password changed successfully!')
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="bg-paper dark:bg-surface min-h-screen">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm mb-6">
          <Link href="/" className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            Home
          </Link>
          <span className="mx-2 text-neutral-400">›</span>
          <Link href="/members" className="text-neutral-500 dark:text-neutral-400 hover:text-brand">
            Profile
          </Link>
          <span className="mx-2 text-neutral-400">›</span>
          <span className="text-ink dark:text-surface-text">Change Password</span>
        </nav>

        <div className="panel p-6">
          <h1 className="display-2 mb-6 text-ink dark:text-surface-text">Change Password</h1>

          {error && (
            <div className="alert alert-error mb-6" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success mb-6" role="alert">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="currentPassword" className="field-label">
                Current Password *
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                required
                value={formData.currentPassword}
                onChange={handleChange}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="field-label">
                New Password *
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                required
                value={formData.newPassword}
                onChange={handleChange}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="field-label">
                Confirm New Password *
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="field"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1 py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'CHANGING...' : 'CHANGE PASSWORD'}
              </button>
              <Link href="/members" className="btn btn-line">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
