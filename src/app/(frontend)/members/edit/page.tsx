'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    description: '',
    company: '',
    companyPhone: '',
    companyEmail: '',
    website: '',
  })

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const data = await res.json()
          // User fields come from user object, membership fields from membership object
          setFormData({
            name: data.user?.name || '',
            surname: data.user?.surname || '',
            phone: data.membership?.phone || '',
            description: data.membership?.description || '',
            company: data.membership?.company || '',
            companyPhone: data.membership?.companyPhone || '',
            companyEmail: data.membership?.companyEmail || '',
            website: data.membership?.website || '',
          })
        }
      } catch {
        setError('Failed to load profile')
      } finally {
        setFetching(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      setSuccess('Profile updated successfully!')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (fetching) {
    return (
      <div className="bg-neutral-50 dark:bg-surface min-h-screen flex items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
      </div>
    )
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
          <span className="text-ink dark:text-surface-text">Edit Profile</span>
        </nav>

        <div className="bg-white dark:bg-surface-raised rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-ink dark:text-surface-text mb-6">Edit Profile</h1>

          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">{error}</div>}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-lg mb-6">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="surname"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Last Name *
                </label>
                <input
                  type="text"
                  id="surname"
                  name="surname"
                  required
                  value={formData.surname}
                  onChange={handleChange}
                  className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                About Me
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            <hr className="my-6 border-neutral-200 dark:border-neutral-700" />
            <h2 className="text-lg font-semibold text-ink dark:text-surface-text">Company Information</h2>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                id="company"
                name="company"
                required
                value={formData.company}
                onChange={handleChange}
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="companyPhone"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Company Phone
                </label>
                <input
                  type="tel"
                  id="companyPhone"
                  name="companyPhone"
                  value={formData.companyPhone}
                  onChange={handleChange}
                  className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="companyEmail"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Company Email
                </label>
                <input
                  type="email"
                  id="companyEmail"
                  name="companyEmail"
                  value={formData.companyEmail}
                  onChange={handleChange}
                  className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Website
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://"
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-brand text-white py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold disabled:opacity-50"
              >
                {loading ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
              <Link
                href="/members"
                className="px-6 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
