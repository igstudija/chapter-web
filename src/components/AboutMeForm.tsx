'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from './RichTextEditor'
import { PhoneInput } from './PhoneInput'
import { WebsiteInput } from './WebsiteInput'
import { CountrySelect } from './CountrySelect'
import { Toast } from './Toast'
import { X, Plus, Loader2, Mail, Pencil } from 'lucide-react'
import { useTranslations } from './TranslationsProvider'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'
import { EmailChangeModal } from './EmailChangeModal'
import { resizeImage, resizePresets } from '@/lib/resizeImage'

interface GalleryItem {
  id?: string | number | null
  image: string | number | { id: string | number; url?: string | null }
  caption?: string | null
}

interface UserData {
  name: string
  surname: string
  phone: string
  description: string
  company: string
  jobPosition: string
  orgRole: string
  companyPhone: string
  companyEmail: string
  website: string
  country: string
  companyDescription: string
  powerGroup: string | null
  gallery: GalleryItem[]
  profileImageUrl?: string
  logoUrl?: string
  tyfcbGiven: number | null
  tyfcbReceived: number | null
}

interface PowerGroup {
  id: string | number
  title: string
}

interface AboutMeFormProps {
  readonly initialData: UserData
  readonly siteId?: string | number
  readonly powerGroups?: ReadonlyArray<PowerGroup>
  readonly userEmail?: string
  readonly pendingEmail?: string | null
}

export function AboutMeForm({
  initialData,
  siteId,
  powerGroups = [],
  userEmail,
  pendingEmail,
}: AboutMeFormProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState<UserData>(initialData)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<
    { file: File; preview: string; caption: string }[]
  >([])
  const [existingGallery, setExistingGallery] = useState<GalleryItem[]>(initialData.gallery || [])
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  /**
   * Whether the member has touched a field since the last time this form was
   * seeded from the server.
   *
   * The profile picture and logo save on their own from the masthead, and each
   * of those calls `router.refresh()`. Without this guard that refresh hands
   * down a fresh `initialData` and the effect below wipes out whatever was
   * half-typed in the fields — a new avatar would silently discard an unsaved
   * bio.
   */
  const dirtyRef = useRef(false)

  useEffect(() => {
    if (dirtyRef.current) return
    setFormData(initialData)
    setExistingGallery(initialData.gallery || [])
  }, [initialData])

  const updateForm = (patch: Partial<UserData>) => {
    dirtyRef.current = true
    setFormData((prev) => ({ ...prev, ...patch }))
  }

  const handleGalleryAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const resizedFiles = await Promise.all(
        Array.from(files).map(async (file) => {
          try {
            const resizedFile = await resizeImage(file, resizePresets.gallery)
            return {
              file: resizedFile,
              preview: URL.createObjectURL(resizedFile),
              caption: '',
            }
          } catch (err) {
            console.error('Failed to resize gallery image:', err)
            // Fallback to original file
            return {
              file,
              preview: URL.createObjectURL(file),
              caption: '',
            }
          }
        }),
      )
      setGalleryFiles((prev) => [...prev, ...resizedFiles])
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = ''
    }
  }

  const handleGalleryRemove = (index: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleExistingGalleryRemove = async (index: number) => {
    const item = existingGallery[index]
    if (!item) return

    const mediaId = typeof item.image === 'object' ? item.image.id : item.image
    setDeleting(`gallery-${index}`)
    try {
      /*
       * Unlink first, delete the file second. The other way round leaves the
       * gallery pointing at a row that no longer exists if the PATCH fails.
       */
      const updatedGallery = existingGallery
        .filter((_, i) => i !== index)
        .map((g) => ({
          image: typeof g.image === 'object' ? g.image.id : g.image,
          caption: g.caption || '',
        }))

      const patched = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gallery: updatedGallery, siteId }),
      })
      if (!patched.ok) throw new Error('Failed to update gallery')

      /*
       * Media ids are numbers on Postgres, so the `typeof === 'string'` guard
       * this used to carry never fired: the row was unlinked and the file was
       * left in the bucket, still fetchable at its original URL by anyone who
       * had the link, while the member believed they had deleted it.
       */
      if (mediaId !== null && mediaId !== undefined) {
        await fetch(`/api/media/${mediaId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      }

      setSuccess(t('profile', 'galleryImageDeleted'))
      setExistingGallery((prev) => prev.filter((_, i) => i !== index))
    } catch (err) {
      console.error('Failed to delete gallery image:', err)
      setError(t('profile', 'failedDeleteGallery'))
    } finally {
      setDeleting(null)
    }
  }

  const handleGalleryCaptionChange = (index: number, caption: string) => {
    setGalleryFiles((prev) => prev.map((item, i) => (i === index ? { ...item, caption } : item)))
  }

  const handleExistingGalleryCaptionChange = (index: number, caption: string) => {
    setExistingGallery((prev) => prev.map((item, i) => (i === index ? { ...item, caption } : item)))
  }

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true
    return /^[0-9\s\-+]+$/.test(phone)
  }

  const validateWebsite = (url: string): boolean => {
    if (!url) return true
    // Simple domain validation - should look like domain.tld
    return /^[\w-]+(\.[\w-]+)+/.test(url)
  }

  const validateEmail = (email: string): boolean => {
    if (!email) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validateFormData = (): string | null => {
    if (!formData.name.trim()) return t('profile', 'firstNameRequired')
    if (!formData.surname.trim()) return t('profile', 'lastNameRequired')
    if (!formData.company.trim()) return t('profile', 'companyRequired')
    if (formData.phone && !validatePhone(formData.phone)) return t('profile', 'invalidPhone')
    if (formData.companyPhone && !validatePhone(formData.companyPhone))
      return t('profile', 'invalidCompanyPhone')
    if (formData.companyEmail && !validateEmail(formData.companyEmail))
      return t('profile', 'invalidEmail')
    if (formData.website && !validateWebsite(formData.website))
      return t('profile', 'invalidWebsite')
    return null
  }

  const uploadMediaFile = async (file: File): Promise<string | undefined> => {
    const formData = new FormData()
    formData.append('file', file)
    const uploadRes = await fetch('/api/media', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    if (uploadRes.ok) {
      const uploadData = await uploadRes.json()
      return uploadData.doc?.id
    }
    return undefined
  }

  const uploadGalleryImage = async (item: {
    file: File
    caption: string
  }): Promise<{ image: number; caption: string } | null> => {
    try {
      const mediaId = await uploadMediaFile(item.file)
      if (mediaId) {
        const numId = Number.parseInt(mediaId, 10)
        if (!Number.isNaN(numId)) {
          return { image: numId, caption: item.caption }
        }
      }
      console.error('Gallery upload missing doc.id')
    } catch (error_) {
      console.error('Gallery upload error:', error_)
    }
    return null
  }

  const uploadGalleryFiles = async (): Promise<{ image: number; caption: string }[]> => {
    const uploadPromises = galleryFiles.map(uploadGalleryImage)
    const results = await Promise.all(uploadPromises)
    return results.filter((item): item is { image: number; caption: string } => item !== null)
  }

  const prepareGalleryData = (uploadedItems: { image: number; caption: string }[]) => {
    const existingItems = existingGallery.map((item) => {
      const imageId = typeof item.image === 'object' ? item.image.id : item.image
      const numId = typeof imageId === 'number' ? imageId : Number.parseInt(String(imageId), 10)
      return {
        image: numId,
        caption: item.caption || '',
      }
    })
    return [...existingItems, ...uploadedItems]
  }

  const buildUpdatePayload = (galleryData?: { image: number; caption: string }[]) => {
    // tyfcbGiven/tyfcbReceived are also editable on the Presentation tab. Only
    // send them when changed here, so a full About Me save doesn't clobber a
    // value edited on the other surface.
    //
    // profileImage/logo are deliberately absent: they belong to the masthead
    // and save themselves, so this form must never send them — doing so would
    // reinstate whatever picture was on screen when it was first rendered.
    const { tyfcbGiven, tyfcbReceived, profileImageUrl, logoUrl, ...rest } = formData
    return {
      ...rest,
      ...(tyfcbGiven !== initialData.tyfcbGiven && { tyfcbGiven }),
      ...(tyfcbReceived !== initialData.tyfcbReceived && { tyfcbReceived }),
      ...(galleryData && { gallery: galleryData }),
      siteId,
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const validationError = validateFormData()
    if (validationError) {
      setError(validationError)
      setLoading(false)
      return
    }

    try {
      const uploadedGalleryItems = await uploadGalleryFiles()
      const galleryData = prepareGalleryData(uploadedGalleryItems)
      const payload = buildUpdatePayload(galleryData)

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      setSuccess(t('profile', 'profileUpdated'))
      setGalleryFiles([])
      // Saved: the server is now the source of truth again, so let the next
      // `initialData` through.
      dirtyRef.current = false
      router.refresh()
    } catch (err) {
      console.error('Profile update error:', err)
      setError(err instanceof Error ? err.message : t('login', 'errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const value = e.target.name === 'companyEmail' ? e.target.value.toLowerCase() : e.target.value
    updateForm({ [e.target.name]: value } as Partial<UserData>)
  }

  const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (value === '') {
      updateForm({ [name]: null } as Partial<UserData>)
      return
    }
    const num = Number(value)
    if (Number.isNaN(num) || num < 0 || num > 99000000) return
    updateForm({ [name]: num } as Partial<UserData>)
  }

  return (
    <>
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}

      {userEmail && (
        <EmailChangeModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          currentEmail={userEmail}
          pendingEmail={pendingEmail}
          onSuccess={() => router.refresh()}
        />
      )}

      {/*
        Layout: a label rail on the left, the fields on the right.

        The form used to be two stacked cards of full-bleed inputs, which is
        the shape every CMS edit screen has had since 2010 — and boxing it or
        centring it only changes how wide the same shape is. This is the
        settings-page layout instead: the section name sits in its own column
        and stays with you while that section scrolls, the fields keep a
        readable measure without the page having to shrink around them, and the
        sections are separated by the same hairline rules the rest of the site
        uses rather than by another border-radius.
      */}
      <form onSubmit={handleSubmit} className="w-full">
        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        {/*
          No rule above the first section: the tab bar already closes on one,
          and two hairlines a few pixels apart read as a mistake rather than as
          structure. Every later section opens with its own.
        */}
        <section className="grid gap-x-12 gap-y-6 pb-10 md:grid-cols-[minmax(160px,220px)_minmax(0,1fr)]">
          <div className="md:sticky md:top-24 md:self-start">
            <h3 className="eyebrow flex items-center gap-3">
              <span className="h-px w-6 shrink-0 bg-brand" aria-hidden="true" />
              {t('profile', 'personalInfo')}
            </h3>
          </div>

          <div className="max-w-3xl space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="field-label">
                {t('profile', 'firstName')} *
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
                {t('profile', 'lastName')} *
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

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="phone" className="field-label">
                {t('profile', 'phone')}
              </label>
              <PhoneInput
                id="phone"
                value={formData.phone}
                onChange={(value) => updateForm({ phone: value })}
              />
            </div>
            <div>
              <label htmlFor="orgRole" className="field-label">
                {t('profile', 'orgRole')}
              </label>
              <input
                type="text"
                id="orgRole"
                name="orgRole"
                value={formData.orgRole}
                onChange={handleChange}
                className="field"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="tyfcbGiven" className="field-label">
                {t('profile', 'businessGiven')}
              </label>
              <input
                type="number"
                id="tyfcbGiven"
                name="tyfcbGiven"
                min={0}
                max={99000000}
                value={formData.tyfcbGiven ?? ''}
                onChange={handleBusinessChange}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="tyfcbReceived" className="field-label">
                {t('profile', 'businessReceived')}
              </label>
              <input
                type="number"
                id="tyfcbReceived"
                name="tyfcbReceived"
                min={0}
                max={99000000}
                value={formData.tyfcbReceived ?? ''}
                onChange={handleBusinessChange}
                className="field"
              />
            </div>
          </div>

          {/*
            The login address is the one thing on this screen that cannot be
            typed over — it changes through a verification round trip. A panel
            nested inside a panel said "another form"; an inset row on the
            section's own surface says "a value, and a way to change it".
          */}
          {userEmail && (
            <div className="rounded-xl border border-line bg-card p-4 dark:border-line-dark dark:bg-surface-raised">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft dark:text-neutral-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink dark:text-surface-text">{userEmail}</p>
                    {pendingEmail && (
                      <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                        {t('profile', 'pendingEmailChange')}: {pendingEmail}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(true)}
                  className="btn btn-line px-3 py-2 text-sm"
                >
                  <Pencil className="h-4 w-4" />
                  {t('profile', 'changeEmail')}
                </button>
              </div>
              <p className="mt-3 text-xs text-ink-soft dark:text-neutral-400">
                {t('profile', 'emailChangeInfo')}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="powerGroup" className="field-label">
              {t('common', 'powerGroup')}
            </label>
            <select
              id="powerGroup"
              name="powerGroup"
              value={formData.powerGroup || ''}
              onChange={handleChange}
              className="field"
            >
              <option value="">{t('common', 'selectPowerGroup')}</option>
              {powerGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">{t('profile', 'aboutMeField')}</label>
            <RichTextEditor
              value={formData.description}
              onChange={(value) => updateForm({ description: value })}
              placeholder={t('profile', 'aboutMePlaceholder')}
            />
          </div>
          </div>
        </section>

        <section className="grid gap-x-12 gap-y-6 border-t border-line py-10 dark:border-line-dark md:grid-cols-[minmax(160px,220px)_minmax(0,1fr)]">
          <div className="md:sticky md:top-24 md:self-start">
            <h3 className="eyebrow flex items-center gap-3">
              <span className="h-px w-6 shrink-0 bg-brand" aria-hidden="true" />
              {t('profile', 'companyInfo')}
            </h3>
          </div>

          <div className="max-w-3xl space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="company" className="field-label">
                {t('profile', 'companyName')} *
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
            <div>
              <label htmlFor="jobPosition" className="field-label">
                {t('profile', 'jobPosition')}
              </label>
              <input
                type="text"
                id="jobPosition"
                name="jobPosition"
                value={formData.jobPosition}
                onChange={handleChange}
                className="field"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="companyPhone" className="field-label">
                {t('profile', 'companyPhone')}
              </label>
              <PhoneInput
                id="companyPhone"
                value={formData.companyPhone}
                onChange={(value) => updateForm({ companyPhone: value })}
              />
            </div>
            <div>
              <label htmlFor="companyEmail" className="field-label">
                {t('profile', 'companyEmail')}
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

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="country" className="field-label">
                {t('profile', 'country')}
              </label>
              <CountrySelect
                id="country"
                value={formData.country}
                onChange={(value) => updateForm({ country: value })}
                placeholder={t('profile', 'countryPlaceholder')}
                searchPlaceholder={t('common', 'search')}
              />
            </div>
            <div>
              <label htmlFor="website" className="field-label">
                {t('profile', 'website')}
              </label>
              <WebsiteInput
                id="website"
                value={formData.website}
                onChange={(value) => updateForm({ website: value })}
                placeholder="example.com"
              />
              <p className="mt-1.5 text-xs text-ink-soft dark:text-neutral-400">
                {t('profile', 'websiteHint')}
              </p>
            </div>
          </div>

          <div>
            <label className="field-label">{t('profile', 'companyDescription')}</label>
            <RichTextEditor
              value={formData.companyDescription}
              onChange={(value) => updateForm({ companyDescription: value })}
              placeholder={t('profile', 'companyDescPlaceholder')}
            />
          </div>

          <div className="border-t border-line pt-5 dark:border-line-dark">
            <label className="field-label">{t('profile', 'gallery')}</label>
            <p className="-mt-1 mb-4 text-xs text-ink-soft dark:text-neutral-400">
              {t('profile', 'galleryHint')}
            </p>

            {/* Existing gallery images */}
            {existingGallery.some((item) => {
              const imageUrl = typeof item.image === 'object' ? item.image.url : ''
              return !!imageUrl
            }) && (
              /*
                Tiles are one object: picture and caption inside a single
                hairline frame, with the caption as the frame's bottom edge
                rather than a stray input floating underneath it. The remove
                control is a legible chip that is always there — the old red
                circle only existed while a mouse was over the tile, which on a
                phone meant it did not exist at all.
              */
              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {existingGallery.map((item, index) => {
                  const imageUrl = typeof item.image === 'object' ? item.image.url : ''
                  if (!imageUrl) return null
                  const imageId = typeof item.image === 'object' ? item.image.id : item.image
                  const itemKey = item.id || imageId || `fallback-${index}`
                  const isDeleting = deleting === `gallery-${index}`
                  return (
                    <figure
                      key={itemKey}
                      className="overflow-hidden rounded-xl border border-line dark:border-line-dark"
                    >
                      <div className="relative">
                        <img
                          src={getThumbnailUrl(imageUrl, 'card') || imageUrl}
                          alt={item.caption || 'Gallery image'}
                          className={`h-40 w-full object-cover ${isDeleting ? 'opacity-50' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleExistingGalleryRemove(index)}
                          disabled={isDeleting}
                          aria-label={t('common', 'delete')}
                          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-neutral-950/60 text-white backdrop-blur-sm transition-colors hover:bg-neutral-950/85 disabled:opacity-70"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={item.caption || ''}
                        onChange={(e) => handleExistingGalleryCaptionChange(index, e.target.value)}
                        placeholder={t('profile', 'caption')}
                        className="field rounded-none border-0 border-t border-line px-3 py-2 text-xs dark:border-line-dark"
                        disabled={isDeleting}
                      />
                    </figure>
                  )
                })}
              </div>
            )}

            {/* New gallery images to upload */}
            {galleryFiles.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {galleryFiles.map((item, index) => (
                  <figure
                    key={item.preview}
                    className="overflow-hidden rounded-xl border border-brand/40"
                  >
                    <div className="relative">
                      <img
                        src={item.preview}
                        alt="Gallery preview"
                        className="h-40 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleGalleryRemove(index)}
                        aria-label={t('common', 'delete')}
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-neutral-950/60 text-white backdrop-blur-sm transition-colors hover:bg-neutral-950/85"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.caption}
                      onChange={(e) => handleGalleryCaptionChange(index, e.target.value)}
                      placeholder={t('profile', 'caption')}
                      className="field rounded-none border-0 border-t border-line px-3 py-2 text-xs dark:border-line-dark"
                    />
                  </figure>
                ))}
              </div>
            )}

            {/* Add gallery button */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryAdd}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-brand hover:text-brand dark:border-line-dark dark:text-neutral-400"
            >
              <Plus className="h-4 w-4" />
              {t('profile', 'addImages')}
            </button>
          </div>
          </div>
        </section>

        {/*
          The action bar follows the page instead of sitting at the end of it,
          but it is a bar, not a billboard: a full-bleed red slab the width of
          the viewport was the loudest element on a screen whose job is quiet
          data entry. It also sits on the same grid as everything above it, so
          the button lands under the fields it saves rather than out at the
          edge of the page.
        */}
        {/*
          A docked action bar, not a floating button.

          Sticky is right — this form is long enough that the save has to travel
          with you — but a lone button pinned over the middle of the page has
          nothing holding it up and reads as debris. Bleeding the bar out to the
          content edges and giving it a top hairline and a surface of its own
          makes it the floor of the screen: everything scrolls behind it, and
          the button sits on the same grid column as the fields it saves.
        */}
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-line bg-paper/90 px-4 py-4 backdrop-blur-md dark:border-line-dark dark:bg-surface/90 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="grid gap-x-12 md:grid-cols-[minmax(160px,220px)_minmax(0,1fr)]">
            <div className="hidden md:block" />
            {/*
              Left-aligned, on the same edge the fields start from. The eye
              travels down that edge through the whole form, so the action
              belongs at the end of it rather than across the page where
              nothing else lives.
            */}
            <div className="flex max-w-3xl justify-start">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full px-8 py-3 sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? t('profile', 'savingChanges') : t('profile', 'saveChangesBtn')}
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
