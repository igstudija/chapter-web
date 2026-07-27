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
      <div className="bg-paper dark:bg-surface min-h-screen flex items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-paper dark:bg-surface min-h-screen">
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

        <div className="panel p-6">
          <h1 className="display-2 mb-6 text-ink dark:text-surface-text">Edit Profile</h1>

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
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="field-label">
                  First Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="surname" className="field-label">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="surname"
                  name="surname"
                  required
                  value={formData.surname}
                  onChange={handleChange}
                  className="field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="field-label">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="description" className="field-label">
                About Me
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="field"
              />
            </div>

            <hr className="my-6 border-line dark:border-line-dark" />
            <h2 className="text-lg font-semibold text-ink dark:text-surface-text">Company Information</h2>

            <div>
              <label htmlFor="company" className="field-label">
                Company Name *
              </label>
              <input
                type="text"
                id="company"
                name="company"
                required
                value={formData.company}
                onChange={handleChange}
                className="field"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="companyPhone" className="field-label">
                  Company Phone
                </label>
                <input
                  type="tel"
                  id="companyPhone"
                  name="companyPhone"
                  value={formData.companyPhone}
                  onChange={handleChange}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="companyEmail" className="field-label">
                  Company Email
                </label>
                <input
                  type="email"
                  id="companyEmail"
                  name="companyEmail"
                  value={formData.companyEmail}
                  onChange={handleChange}
                  className="field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="website" className="field-label">
                Website
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://"
                className="field"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1 py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'SAVING...' : 'SAVE CHANGES'}
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
