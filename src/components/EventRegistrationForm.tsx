'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface EventRegistrationTranslations {
  title: string
  fullName: string
  emailAddress: string
  phoneNumber: string
  company: string
  invitedBy: string
  messageOrQuestions: string
  registerNow: string
  submitting: string
  successTitle: string
  successMessage: string
  fillFormSlowly: string
  failedToSubmit: string
  somethingWentWrong: string
}

interface EventRegistrationFormProps {
  readonly eventId: string
  readonly eventTitle: string
  readonly translations: EventRegistrationTranslations
}

export function EventRegistrationForm({
  eventId,
  eventTitle,
  translations: t,
}: EventRegistrationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const formLoadTime = useRef<number>(Date.now())

  useEffect(() => {
    formLoadTime.current = Date.now()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Bot protection: Check honeypot field
    const honeypot = formData.get('website')
    if (honeypot) {
      // Bot detected - silently fail
      setIsSubmitting(false)
      return
    }

    // Bot protection: Check form fill time (minimum 3 seconds)
    const fillTime = Date.now() - formLoadTime.current
    if (fillTime < 3000) {
      setError(t.fillFormSlowly)
      setIsSubmitting(false)
      return
    }

    const data = {
      event: eventId,
      name: formData.get('name'),
      email: (formData.get('email') as string)?.toLowerCase(),
      phone: formData.get('phone') || undefined,
      company: formData.get('company') || undefined,
      invitedBy: formData.get('invitedBy') || undefined,
      message: formData.get('message') || undefined,
      status: 'pending',
    }

    try {
      // Use Payload's built-in REST API directly
      const response = await fetch('/api/event-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(t.failedToSubmit)
      }

      setSuccess(true)
      e.currentTarget.reset()

      // Refresh the page after 2 seconds
      setTimeout(() => {
        router.refresh()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.somethingWentWrong)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
          {t.successTitle}
        </h3>
        <p className="text-green-700 dark:text-green-300">
          {t.successMessage.replace('{eventTitle}', eventTitle)}
        </p>
      </div>
    )
  }

  return (
    <div className="panel p-6">
      <h3 className="font-display mb-4 text-2xl font-bold tracking-tight text-ink dark:text-surface-text">{t.title}</h3>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            {t.fullName} *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="field"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            {t.emailAddress} *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="field"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            {t.phoneNumber} *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            className="field"
          />
        </div>

        <div>
          <label
            htmlFor="company"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            {t.company}
          </label>
          <input
            type="text"
            id="company"
            name="company"
            className="field"
          />
        </div>

        <div>
          <label
            htmlFor="invitedBy"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            {t.invitedBy}
          </label>
          <input
            type="text"
            id="invitedBy"
            name="invitedBy"
            className="field"
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            {t.messageOrQuestions}
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            className="field"
          />
        </div>

        {/* Honeypot field - hidden from users but visible to bots */}
        <input
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          className="absolute left-[-9999px] w-1 h-1 opacity-0"
          aria-hidden="true"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? t.submitting : t.registerNow}
        </button>
      </form>
    </div>
  )
}
