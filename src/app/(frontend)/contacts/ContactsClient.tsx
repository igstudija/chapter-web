'use client'

import { useState, useEffect, useRef } from 'react'
import { Mail, Phone } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'

interface ContactsLabels {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  sending: string
  sendMessage: string
  formFillError: string
  sendError: string
}

interface ContactsPageProps {
  pageData: any
  labels: ContactsLabels
}

export default function ContactsPageClient({ pageData, labels }: ContactsPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [honeypot, setHoneypot] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const formLoadTime = useRef<number>(Date.now())

  useEffect(() => {
    formLoadTime.current = Date.now()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    // Bot protection: Check honeypot field
    if (honeypot) {
      // Bot detected - silently fail
      setLoading(false)
      return
    }

    // Bot protection: Check form fill time (minimum 3 seconds)
    const fillTime = Date.now() - formLoadTime.current
    if (fillTime < 3000) {
      setError(labels.formFillError)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, _submitTime: fillTime }),
      })

      if (!res.ok) {
        throw new Error('Failed to send message')
      }

      setSuccess(true)
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      setError(labels.sendError)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.name === 'email' ? e.target.value.toLowerCase() : e.target.value
    setFormData((prev) => ({ ...prev, [e.target.name]: value }))
  }

  const page = pageData
  const formSettings = page?.formSettings
  const contactPersons = page?.contactPersons || []

  return (
    <>
      {/* Contact Persons */}
      {contactPersons.length > 0 && (
        <div className="mb-16">
          {/* First Contact - Separate Row */}
          {contactPersons.length > 0 &&
            (() => {
              const item = contactPersons[0]
              const member = item.member
              if (!member || typeof member !== 'object') return null

              const user = typeof member.user === 'object' ? member.user : null
              const name = user?.name || ''
              const surname = user?.surname || ''
              const email = member.email || user?.email || ''
              const phone = member.phone || ''
              const orgRole = member.orgRole || ''
              const jobPosition = member.jobPosition || ''
              const company = member.company || ''

              const profileImage =
                member.profileImage && typeof member.profileImage === 'object'
                  ? member.profileImage.url
                  : null

              return (
                <div className="flex justify-center mb-8">
                  <div className="text-center space-y-2 max-w-xs">
                    {profileImage && (
                      <div className="flex justify-center mb-3">
                        <img
                          src={getThumbnailUrl(profileImage, 'thumbnail') || profileImage}
                          alt={`${name} ${surname}`}
                          className="h-24 w-24 rounded-full object-cover ring-1 ring-line dark:ring-line-dark"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h3 className="font-display text-lg font-semibold tracking-tight text-ink dark:text-surface-text">
                      {name} {surname}
                    </h3>
                    {orgRole && (
                      <p className="eyebrow">{orgRole}</p>
                    )}
                    {(jobPosition || company) && (
                      <p className="text-sm text-ink-soft dark:text-neutral-400">
                        {jobPosition}
                        {jobPosition && company && ', '}
                        {company}
                      </p>
                    )}
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="flex items-center justify-center gap-1.5 break-words text-sm text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
                      >
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{email}</span>
                      </a>
                    )}
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="tabular flex items-center justify-center gap-1.5 font-mono text-xs text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
                      >
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              )
            })()}

          {/* Remaining Contacts - Centered Grid */}
          {contactPersons.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
              {contactPersons.slice(1).map((item: any, index: number) => {
                const member = item.member
                if (!member || typeof member !== 'object') return null

                const user = typeof member.user === 'object' ? member.user : null
                const name = user?.name || ''
                const surname = user?.surname || ''
                const email = member.email || user?.email || ''
                const phone = member.phone || ''
                const orgRole = member.orgRole || ''
                const jobPosition = member.jobPosition || ''
                const company = member.company || ''

                const profileImage =
                  member.profileImage && typeof member.profileImage === 'object'
                    ? member.profileImage.url
                    : null

                return (
                  <div key={member.id || index} className="text-center space-y-2 max-w-xs">
                    {profileImage && (
                      <div className="flex justify-center mb-3">
                        <img
                          src={getThumbnailUrl(profileImage, 'thumbnail') || profileImage}
                          alt={`${name} ${surname}`}
                          className="h-24 w-24 rounded-full object-cover ring-1 ring-line dark:ring-line-dark"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h3 className="font-display text-lg font-semibold tracking-tight text-ink dark:text-surface-text">
                      {name} {surname}
                    </h3>
                    {orgRole && (
                      <p className="eyebrow">{orgRole}</p>
                    )}
                    {(jobPosition || company) && (
                      <p className="text-sm text-ink-soft dark:text-neutral-400">
                        {jobPosition}
                        {jobPosition && company && ', '}
                        {company}
                      </p>
                    )}
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="flex items-center justify-center gap-1.5 break-words text-sm text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
                      >
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{email}</span>
                      </a>
                    )}
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="tabular flex items-center justify-center gap-1.5 font-mono text-xs text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
                      >
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{phone}</span>
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Contact Form - Separate Section */}
      <div className="mt-20 border-t border-line pt-16 dark:border-line-dark">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="display-2 mb-4 text-ink dark:text-surface-text">
              {formSettings?.formTitle || 'RAKSTI MUMS'}
            </h2>
            {formSettings?.formDescription && (
              <p className="text-neutral-600 dark:text-neutral-300">
                {formSettings.formDescription}
              </p>
            )}
          </div>

          <div className="panel p-8 md:p-10">
            {success && (
              <div className="mb-6 rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
                {formSettings?.successMessage}
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-lg border border-rose-600/25 bg-rose-500/10 p-4 text-sm text-rose-800 dark:text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="field-label"
                >
                  {labels.name} *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="field"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="field-label"
                >
                  {labels.email} *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="field"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="field-label"
                >
                  {labels.phone}
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
                <label
                  htmlFor="subject"
                  className="field-label"
                >
                  {labels.subject} *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="field"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="field-label"
                >
                  {labels.message} *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="field"
                  required
                />
              </div>

              {/* Honeypot field - hidden from users but visible to bots */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
                className="absolute left-[-9999px] w-1 h-1 opacity-0"
                aria-hidden="true"
              />

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? labels.sending : formSettings?.submitButtonText || labels.sendMessage}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
