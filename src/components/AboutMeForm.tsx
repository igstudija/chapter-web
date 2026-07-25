'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from './RichTextEditor'
import { PhoneInput } from './PhoneInput'
import { WebsiteInput } from './WebsiteInput'
import { CountrySelect } from './CountrySelect'
import { Toast } from './Toast'
import { Camera, Upload, X, Plus, Loader2, Mail, Pencil } from 'lucide-react'
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
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string | null>(
    initialData.profileImageUrl || null,
  )
  const [removeProfileImage, setRemoveProfileImage] = useState(false)
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData.logoUrl || null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<
    { file: File; preview: string; caption: string }[]
  >([])
  const [existingGallery, setExistingGallery] = useState<GalleryItem[]>(initialData.gallery || [])
  const profileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)

  useEffect(() => {
    setFormData(initialData)
    setProfilePreview(initialData.profileImageUrl || null)
    setLogoPreview(initialData.logoUrl || null)
    setExistingGallery(initialData.gallery || [])
    setRemoveProfileImage(false)
    setRemoveLogo(false)
  }, [initialData])

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const resizedFile = await resizeImage(file, resizePresets.profile)
        setProfileImage(resizedFile)
        setProfilePreview(URL.createObjectURL(resizedFile))
        setRemoveProfileImage(false)
      } catch (err) {
        console.error('Failed to resize image:', err)
        // Fallback to original file
        setProfileImage(file)
        setProfilePreview(URL.createObjectURL(file))
        setRemoveProfileImage(false)
      }
    }
  }

  const handleProfileImageRemove = async () => {
    if (!initialData.profileImageUrl) {
      setProfileImage(null)
      setProfilePreview(null)
      return
    }

    setDeleting('profile')
    try {
      const url = siteId ? `/api/users/me?siteId=${siteId}` : '/api/users/me'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        // profileImage is stored in membership, not user
        const mediaId = data.membership?.profileImage?.id || data.membership?.profileImage
        if (mediaId && typeof mediaId === 'string') {
          const deleteRes = await fetch(`/api/media/${mediaId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
          if (deleteRes.ok) {
            setSuccess(t('profile', 'profilePhotoDeleted'))
          } else {
            throw new Error('Failed to delete')
          }
        }
      }
      setProfileImage(null)
      setProfilePreview(null)
      setRemoveProfileImage(true)
      if (profileInputRef.current) {
        profileInputRef.current.value = ''
      }
      router.refresh()
    } catch (err) {
      console.error('Failed to delete profile image:', err)
      setError(t('profile', 'failedDeletePhoto'))
    } finally {
      setDeleting(null)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const resizedFile = await resizeImage(file, resizePresets.logo)
        setLogo(resizedFile)
        setLogoPreview(URL.createObjectURL(resizedFile))
        setRemoveLogo(false)
      } catch (err) {
        console.error('Failed to resize logo:', err)
        // Fallback to original file
        setLogo(file)
        setLogoPreview(URL.createObjectURL(file))
        setRemoveLogo(false)
      }
    }
  }

  const handleLogoRemove = async () => {
    if (!initialData.logoUrl) {
      setLogo(null)
      setLogoPreview(null)
      return
    }

    setDeleting('logo')
    try {
      const url = siteId ? `/api/users/me?siteId=${siteId}` : '/api/users/me'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        // logo is stored in membership, not user
        const mediaId = data.membership?.logo?.id || data.membership?.logo
        if (mediaId && typeof mediaId === 'string') {
          const deleteRes = await fetch(`/api/media/${mediaId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
          if (deleteRes.ok) {
            setSuccess(t('profile', 'companyLogoDeleted'))
          } else {
            throw new Error('Failed to delete')
          }
        }
      }
      setLogo(null)
      setLogoPreview(null)
      setRemoveLogo(true)
      if (logoInputRef.current) {
        logoInputRef.current.value = ''
      }
      router.refresh()
    } catch (err) {
      console.error('Failed to delete logo:', err)
      setError(t('profile', 'failedDeleteLogo'))
    } finally {
      setDeleting(null)
    }
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
      // Delete media file from storage via Payload
      if (mediaId && typeof mediaId === 'string') {
        await fetch(`/api/media/${mediaId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      }

      // Update user's gallery to remove this item
      const updatedGallery = existingGallery
        .filter((_, i) => i !== index)
        .map((g) => ({
          image: typeof g.image === 'object' ? g.image.id : g.image,
          caption: g.caption || '',
        }))

      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gallery: updatedGallery, siteId }),
      })

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

  const buildUpdatePayload = (
    profileImageId?: string,
    logoId?: string,
    galleryData?: { image: number; caption: string }[],
  ) => {
    // tyfcbGiven/tyfcbReceived are also editable on the Presentation tab. Only
    // send them when changed here, so a full About Me save doesn't clobber a
    // value edited on the other surface.
    const { tyfcbGiven, tyfcbReceived, ...rest } = formData
    return {
      ...rest,
      ...(tyfcbGiven !== initialData.tyfcbGiven && { tyfcbGiven }),
      ...(tyfcbReceived !== initialData.tyfcbReceived && { tyfcbReceived }),
      ...(galleryData && { gallery: galleryData }),
      ...(profileImageId && { profileImage: profileImageId }),
      ...(removeProfileImage && { profileImage: null }),
      ...(logoId && { logo: logoId }),
      ...(removeLogo && { logo: null }),
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
      const profileImageId = profileImage ? await uploadMediaFile(profileImage) : undefined
      const logoId = logo ? await uploadMediaFile(logo) : undefined
      const uploadedGalleryItems = await uploadGalleryFiles()
      const galleryData = prepareGalleryData(uploadedGalleryItems)
      const payload = buildUpdatePayload(profileImageId, logoId, galleryData)

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
    setFormData((prev) => ({ ...prev, [e.target.name]: value }))
  }

  const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (value === '') {
      setFormData((prev) => ({ ...prev, [name]: null }))
      return
    }
    const num = Number(value)
    if (Number.isNaN(num) || num < 0 || num > 99000000) return
    setFormData((prev) => ({ ...prev, [name]: num }))
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-ink dark:text-surface-text mb-4">
            {t('profile', 'personalInfo')}
          </h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('profile', 'profilePhoto')}
            </label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                {profilePreview ? (
                  <>
                    <img
                      src={getThumbnailUrl(profilePreview, 'thumbnail') || profilePreview}
                      alt="Profile"
                      className={`w-24 h-24 rounded-full object-cover border-2 border-neutral-200 ${deleting === 'profile' ? 'opacity-50' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={handleProfileImageRemove}
                      disabled={deleting === 'profile'}
                      className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                    >
                      {deleting === 'profile' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-600">
                    <Camera className="h-8 w-8 text-neutral-400" />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => profileInputRef.current?.click()}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-sm font-medium"
                >
                  <Upload className="h-4 w-4 inline mr-2" />
                  {t('profile', 'uploadPhoto')}
                </button>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {t('profile', 'photoHint')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'firstName')} *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-neutral-300 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="surname"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'lastName')} *
              </label>
              <input
                type="text"
                id="surname"
                name="surname"
                required
                value={formData.surname}
                onChange={handleChange}
                className="w-full border border-neutral-300 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'phone')}
              </label>
              <PhoneInput
                id="phone"
                value={formData.phone}
                onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))}
              />
            </div>
            <div>
              <label
                htmlFor="orgRole"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'orgRole')}
              </label>
              <input
                type="text"
                id="orgRole"
                name="orgRole"
                value={formData.orgRole}
                onChange={handleChange}
                className="w-full border border-neutral-300 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label
                htmlFor="tyfcbGiven"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
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
                className="w-full border border-neutral-300 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="tyfcbReceived"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
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
                className="w-full border border-neutral-300 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
          </div>

          {/* Email Section */}
          {userEmail && (
            <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                  <div>
                    <p className="text-neutral-900 dark:text-surface-text">{userEmail}</p>
                    {pendingEmail && (
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                        {t('profile', 'pendingEmailChange')}: {pendingEmail}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  {t('profile', 'changeEmail')}
                </button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                {t('profile', 'emailChangeInfo')}
              </p>
            </div>
          )}

          <div className="mt-4">
            <label
              htmlFor="powerGroup"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              {t('common', 'powerGroup')}
            </label>
            <select
              id="powerGroup"
              name="powerGroup"
              value={formData.powerGroup || ''}
              onChange={handleChange}
              className="w-full border border-neutral-300 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
            >
              <option value="">{t('common', 'selectPowerGroup')}</option>
              {powerGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.title}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t('profile', 'aboutMeField')}
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
              placeholder={t('profile', 'aboutMePlaceholder')}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-ink dark:text-surface-text mb-4">
            {t('profile', 'companyInfo')}
          </h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('profile', 'companyLogo')}
            </label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                {logoPreview ? (
                  <>
                    <img
                      src={getThumbnailUrl(logoPreview, 'thumbnail') || logoPreview}
                      alt="Company Logo"
                      className={`w-32 h-20 object-contain border-2 border-neutral-200 rounded bg-white p-2 ${deleting === 'logo' ? 'opacity-50' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      disabled={deleting === 'logo'}
                      className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                    >
                      {deleting === 'logo' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </>
                ) : (
                  <div className="w-32 h-16 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                    <Upload className="h-6 w-6 text-neutral-400" />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-sm font-medium"
                >
                  <Upload className="h-4 w-4 inline mr-2" />
                  {t('profile', 'uploadLogo')}
                </button>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {t('profile', 'logoHint')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="company"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'companyName')} *
              </label>
              <input
                type="text"
                id="company"
                name="company"
                required
                value={formData.company}
                onChange={handleChange}
                className="w-full border border-neutral-300 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="jobPosition"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'jobPosition')}
              </label>
              <input
                type="text"
                id="jobPosition"
                name="jobPosition"
                value={formData.jobPosition}
                onChange={handleChange}
                className="w-full border border-neutral-300 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label
                htmlFor="companyPhone"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'companyPhone')}
              </label>
              <PhoneInput
                id="companyPhone"
                value={formData.companyPhone}
                onChange={(value) => setFormData((prev) => ({ ...prev, companyPhone: value }))}
              />
            </div>
            <div>
              <label
                htmlFor="companyEmail"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'companyEmail')}
              </label>
              <input
                type="email"
                id="companyEmail"
                name="companyEmail"
                value={formData.companyEmail}
                onChange={handleChange}
                className="w-full border border-neutral-300 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'country')}
              </label>
              <CountrySelect
                id="country"
                value={formData.country}
                onChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
                placeholder={t('profile', 'countryPlaceholder')}
                searchPlaceholder={t('common', 'search')}
              />
            </div>
            <div>
              <label
                htmlFor="website"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t('profile', 'website')}
              </label>
              <WebsiteInput
                id="website"
                value={formData.website}
                onChange={(value) => setFormData((prev) => ({ ...prev, website: value }))}
                placeholder="example.com"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {t('profile', 'websiteHint')}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t('profile', 'companyDescription')}
            </label>
            <RichTextEditor
              value={formData.companyDescription}
              onChange={(value) => setFormData((prev) => ({ ...prev, companyDescription: value }))}
              placeholder={t('profile', 'companyDescPlaceholder')}
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('profile', 'gallery')}
            </label>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
              {t('profile', 'galleryHint')}
            </p>

            {/* Existing gallery images */}
            {existingGallery.some((item) => {
              const imageUrl = typeof item.image === 'object' ? item.image.url : ''
              return !!imageUrl
            }) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {existingGallery.map((item, index) => {
                  const imageUrl = typeof item.image === 'object' ? item.image.url : ''
                  if (!imageUrl) return null
                  const imageId = typeof item.image === 'object' ? item.image.id : item.image
                  const itemKey = item.id || imageId || `fallback-${index}`
                  const isDeleting = deleting === `gallery-${index}`
                  return (
                    <div key={itemKey} className="relative group">
                      <img
                        src={getThumbnailUrl(imageUrl, 'card') || imageUrl}
                        alt={item.caption || 'Gallery image'}
                        className={`w-full h-48 object-cover rounded-lg ${isDeleting ? 'opacity-50' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleExistingGalleryRemove(index)}
                        disabled={isDeleting}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                      <input
                        type="text"
                        value={item.caption || ''}
                        onChange={(e) => handleExistingGalleryCaptionChange(index, e.target.value)}
                        placeholder={t('profile', 'caption')}
                        className="mt-1 w-full text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded px-2 py-1"
                        disabled={isDeleting}
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* New gallery images to upload */}
            {galleryFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {galleryFiles.map((item, index) => (
                  <div key={item.preview} className="relative group">
                    <img
                      src={item.preview}
                      alt="Gallery preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleGalleryRemove(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      value={item.caption}
                      onChange={(e) => handleGalleryCaptionChange(index, e.target.value)}
                      placeholder={t('profile', 'caption')}
                      className="mt-1 w-full text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded px-2 py-1"
                    />
                  </div>
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
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-600 dark:text-neutral-300 hover:border-brand hover:text-brand transition-colors"
            >
              <Plus className="h-5 w-5" />
              {t('profile', 'addImages')}
            </button>
          </div>
        </div>

        {/* Sticky save button - stays at bottom when scrolling */}
        <div className="sticky bottom-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white py-3 rounded-lg hover:bg-brand-dark transition-colors font-semibold disabled:opacity-50 shadow-lg"
          >
            {loading ? t('profile', 'savingChanges') : t('profile', 'saveChangesBtn')}
          </button>
        </div>
      </form>
    </>
  )
}
