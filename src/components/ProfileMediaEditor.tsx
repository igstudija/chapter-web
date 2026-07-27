'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Trash2, Upload } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/getThumbnailUrl'
import { resizeImage, resizePresets } from '@/lib/resizeImage'
import { useTranslations } from './TranslationsProvider'
import { Toast } from './Toast'

type Variant = 'avatar' | 'logo'

interface ProfileMediaEditorProps {
  readonly variant: Variant
  readonly url?: string | null
  /** Alt text and, for the avatar placeholder, the source of the initials. */
  readonly alt: string
  readonly initials?: string
  /** Read-only rendering for anyone looking at someone else's profile. */
  readonly editable?: boolean
}

/**
 * The profile picture and company logo, editable in place.
 *
 * These two images used to be uploaded from inside the About Me form, which
 * meant the header showed them and the form below showed them again — the same
 * picture twice on one screen, with the copy of it you could actually change
 * being the one three sections down. They belong to the masthead, and they
 * save on their own: an avatar is not a draft, and nobody expects to press
 * "save changes" at the bottom of a long form to make a new photo stick.
 */
export function ProfileMediaEditor({
  variant,
  url,
  alt,
  initials,
  editable = false,
}: ProfileMediaEditorProps) {
  const router = useRouter()
  const { t } = useTranslations()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(url || null)
  const [busy, setBusy] = useState<'upload' | 'delete' | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  /** The blob currently on screen, if any — the only one we are responsible for. */
  const objectUrlRef = useRef<string | null>(null)

  const releaseObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  /*
   * A freshly uploaded file is shown from a local blob so the change lands
   * instantly, but that blob is a stand-in, not the picture of record. Once the
   * server comes back with the stored URL, hand over to it and release the
   * blob: holding on would keep a decoded copy of every upload in memory for
   * the life of the page and leave the header rendering a client-side image
   * that no longer matches what anyone else sees.
   */
  useEffect(() => {
    releaseObjectUrl()
    setPreview(url || null)
  }, [url])

  useEffect(() => releaseObjectUrl, [])

  const isAvatar = variant === 'avatar'
  const field = isAvatar ? 'profileImage' : 'logo'

  const patchMembership = async (value: string | number | null) => {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ [field]: value }),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return

    setBusy('upload')
    const objectUrl = URL.createObjectURL(file)
    try {
      /*
       * Resizing is best-effort: a browser that cannot decode the file still
       * gets to upload the original rather than being told no.
       */
      let upload: File = file
      try {
        upload = await resizeImage(file, isAvatar ? resizePresets.profile : resizePresets.logo)
      } catch (err) {
        console.error('Failed to resize image:', err)
      }

      const body = new FormData()
      body.append('file', upload)
      const uploadRes = await fetch('/api/media', { method: 'POST', body, credentials: 'include' })
      if (!uploadRes.ok) throw new Error('upload failed')
      const uploaded = await uploadRes.json()
      const mediaId = uploaded.doc?.id
      if (!mediaId) throw new Error('upload returned no id')

      await patchMembership(mediaId)
      releaseObjectUrl()
      objectUrlRef.current = objectUrl
      setPreview(objectUrl)
      setToast({ message: t('profile', 'profileUpdated'), type: 'success' })
      router.refresh()
    } catch (err) {
      console.error('Profile media upload failed:', err)
      URL.revokeObjectURL(objectUrl)
      setToast({ message: t('profile', 'uploadFailed'), type: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    setBusy('delete')
    try {
      /*
       * Unlink first, delete the file second. Doing it the other way round
       * leaves the membership pointing at a row that no longer exists for as
       * long as the second request is in flight.
       */
      const meRes = await fetch('/api/users/me', { credentials: 'include' })
      const mediaId = meRes.ok
        ? (await meRes.json()).membership?.[field]?.id ?? null
        : null

      await patchMembership(null)

      if (mediaId !== null && mediaId !== undefined) {
        await fetch(`/api/media/${mediaId}`, { method: 'DELETE', credentials: 'include' })
      }

      setPreview(null)
      setToast({
        message: t('profile', isAvatar ? 'profilePhotoDeleted' : 'companyLogoDeleted'),
        type: 'success',
      })
      router.refresh()
    } catch (err) {
      console.error('Profile media delete failed:', err)
      setToast({
        message: t('profile', isAvatar ? 'failedDeletePhoto' : 'failedDeleteLogo'),
        type: 'error',
      })
    } finally {
      setBusy(null)
    }
  }

  const chip =
    'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-card text-ink-soft transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 dark:border-line-dark dark:bg-surface-raised dark:text-neutral-400'

  const media = preview ? (
    <img
      src={getThumbnailUrl(preview, 'card') || preview}
      alt={alt}
      /*
        The logo gets a fixed box rather than `max-h-16` and an auto width. The
        white plate around it is shrink-to-fit, and an image whose only width
        constraint is `max-width: 100%` of a shrink-to-fit parent resolves to
        zero — the plate rendered as an empty 24px square.
      */
      className={
        isAvatar
          ? `h-28 w-28 rounded-full object-cover ring-1 ring-line dark:ring-line-dark ${busy ? 'opacity-50' : ''}`
          : `h-16 w-32 object-contain ${busy ? 'opacity-50' : ''}`
      }
    />
  ) : isAvatar ? (
    /*
      A solid brand-red disc with white initials was the loudest thing on the
      page and said nothing. Initials on a hairline circle read as a
      placeholder, which is what it is.
    */
    <div className="flex h-28 w-28 items-center justify-center rounded-full border border-line font-display text-3xl font-bold tracking-tight text-brand dark:border-line-dark">
      {initials}
    </div>
  ) : (
    <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed border-line-strong text-neutral-400 dark:border-line-dark">
      <Upload className="h-5 w-5" />
    </div>
  )

  // Someone else's profile: the picture, and nothing to press.
  if (!editable) {
    if (!preview && !isAvatar) return null
    return isAvatar ? (
      media
    ) : (
      <div className="rounded-lg bg-white p-3 ring-1 ring-line">{media}</div>
    )
  }

  return (
    <div className={`flex flex-col gap-3 ${isAvatar ? 'items-center' : 'items-end'}`}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {isAvatar ? media : <div className="rounded-lg bg-white p-3 ring-1 ring-line">{media}</div>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleSelect}
        className="hidden"
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          className={chip}
          title={t('profile', isAvatar ? 'uploadPhoto' : 'uploadLogo')}
          aria-label={t('profile', isAvatar ? 'uploadPhoto' : 'uploadLogo')}
        >
          {busy === 'upload' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>
        {preview && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy !== null}
            className={chip}
            title={t('common', 'delete')}
            aria-label={t('common', 'delete')}
          >
            {busy === 'delete' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
