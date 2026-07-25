import Image from 'next/image'
import { Building2, Phone, Mail, Globe } from 'lucide-react'
import { GalleryLightbox } from './GalleryLightbox'

interface GalleryItem {
  id?: string | number | null
  image: string | number | { id: string | number; url?: string | null }
  caption?: string | null
}

interface MemberData {
  name: string
  surname: string
  phone: string
  loginEmail?: string
  description: string
  company: string
  companyPhone: string
  companyEmail: string
  website: string
  companyDescription?: string
  gallery?: GalleryItem[]
  profileImageUrl?: string
  logoUrl?: string
}

interface MemberAboutViewProps {
  member: MemberData
  labels: {
    about: string
    noDescription: string
    company: string
    gallery: string
    contact: string
    personalContact?: string
    companyContact?: string
  }
}

export function MemberAboutView({ member, labels }: Readonly<MemberAboutViewProps>) {
  return (
    <div className="grid md:grid-cols-3 gap-6 overflow-hidden">
      {/* About Section - Takes 2 columns */}
      <div className="md:col-span-2 space-y-6 min-w-0">
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg p-6 overflow-hidden">
          <h3 className="text-lg font-semibold text-ink dark:text-surface-text mb-4">
            {labels.about}
          </h3>
          {member.description ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-300 break-word overflow-hidden"
              dangerouslySetInnerHTML={{ __html: member.description }}
            />
          ) : (
            <p className="text-neutral-400 dark:text-neutral-500 italic">{labels.noDescription}</p>
          )}
        </div>

        {/* Company Info */}
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg p-6 overflow-hidden">
          <h3 className="text-lg font-semibold text-ink dark:text-surface-text mb-4">
            {labels.company}
          </h3>
          <div className="flex items-start gap-4 mb-4">
            {member.logoUrl ? (
              <Image
                src={member.logoUrl}
                alt={member.company}
                width={80}
                height={80}
                className="w-20 h-20 object-contain rounded-lg p-2 bg-white shrink-0"
              />
            ) : (
              <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center shrink-0">
                <Building2 className="h-8 w-8 text-neutral-400" />
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-xl font-semibold text-ink dark:text-surface-text break-word">
                {member.company}
              </h4>
            </div>
          </div>
          {member.companyDescription && (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-300 break-word overflow-hidden"
              dangerouslySetInnerHTML={{ __html: member.companyDescription }}
            />
          )}
        </div>

        {/* Gallery */}
        {member.gallery && member.gallery.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink dark:text-surface-text mb-4">
              {labels.gallery}
            </h3>
            <GalleryLightbox gallery={member.gallery} />
          </div>
        )}
      </div>

      {/* Contact Card - Takes 1 column */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-ink dark:text-surface-text mb-4">
          {labels.contact}
        </h3>

        <div className="space-y-4">
          {/* Personal Contact Section */}
          {(member.phone || member.loginEmail) && (
            <>
              {labels.personalContact && (
                <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  {labels.personalContact}
                </h4>
              )}

              {/* Personal Phone */}
              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300 hover:text-brand transition-colors"
                >
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
                  </div>
                  <span>{member.phone}</span>
                </a>
              )}

              {/* Personal Email (Login Email) */}
              {member.loginEmail && (
                <a
                  href={`mailto:${member.loginEmail}`}
                  className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300 hover:text-brand transition-colors"
                >
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
                  </div>
                  <span className="break-all">{member.loginEmail}</span>
                </a>
              )}
            </>
          )}

          {/* Company Contact Section */}
          {(member.companyPhone || member.companyEmail || member.website) && (
            <>
              {labels.companyContact && (member.phone || member.loginEmail) && (
                <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mt-6">
                  {labels.companyContact}
                </h4>
              )}

              {/* Company Phone */}
              {member.companyPhone && (
                <a
                  href={`tel:${member.companyPhone}`}
                  className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300 hover:text-brand transition-colors"
                >
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
                  </div>
                  <span>{member.companyPhone}</span>
                </a>
              )}

              {/* Company Email */}
              {member.companyEmail && (
                <a
                  href={`mailto:${member.companyEmail}`}
                  className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300 hover:text-brand transition-colors"
                >
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
                  </div>
                  <span className="break-all">{member.companyEmail}</span>
                </a>
              )}

              {/* Website */}
              {member.website && (
                <a
                  href={`https://${member.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300 hover:text-brand transition-colors"
                >
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                    <Globe className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
                  </div>
                  <span className="break-all">{member.website}</span>
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
