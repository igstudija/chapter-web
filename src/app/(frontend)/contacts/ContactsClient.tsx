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
                          className="w-24 h-24 rounded-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-ink dark:text-surface-text">
                      {name} {surname}
                    </h3>
                    {orgRole && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                        {orgRole}
                      </p>
                    )}
                    {(jobPosition || company) && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-500">
                        {jobPosition}
                        {jobPosition && company && ', '}
                        {company}
                      </p>
                    )}
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="flex items-center justify-center gap-1.5 text-sm text-brand hover:text-brand-dark transition-colors break-words"
                      >
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{email}</span>
                      </a>
                    )}
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="flex items-center justify-center gap-1.5 text-sm text-brand hover:text-brand-dark transition-colors"
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
                          className="w-24 h-24 rounded-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-ink dark:text-surface-text">
                      {name} {surname}
                    </h3>
                    {orgRole && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                        {orgRole}
                      </p>
                    )}
                    {(jobPosition || company) && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-500">
                        {jobPosition}
                        {jobPosition && company && ', '}
                        {company}
                      </p>
                    )}
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="flex items-center justify-center gap-1.5 text-sm text-brand hover:text-brand-dark transition-colors break-words"
                      >
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{email}</span>
                      </a>
                    )}
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="flex items-center justify-center gap-1.5 text-sm text-brand hover:text-brand-dark transition-colors"
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
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 mt-16 py-16 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-ink dark:text-surface-text mb-3">
              {formSettings?.formTitle || 'RAKSTI MUMS'}
            </h2>
            {formSettings?.formDescription && (
              <p className="text-neutral-600 dark:text-neutral-300">
                {formSettings.formDescription}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-surface-raised rounded-lg shadow-md p-8">
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-200 p-4 rounded-lg mb-6">
                {formSettings?.successMessage}
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {labels.name} *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {labels.email} *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {labels.phone}
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {labels.subject} *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {labels.message} *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-surface text-ink dark:text-surface-text rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
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
                className="w-full bg-brand text-white py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold disabled:opacity-50"
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
