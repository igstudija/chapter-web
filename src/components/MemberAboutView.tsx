import Image from 'next/image'
import { Building2, Phone, Mail, Globe, ArrowUpRight } from 'lucide-react'
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

/** The mono label with a brand tick that opens every section on the site. */
function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p className="eyebrow mb-5 flex items-center gap-3">
      <span aria-hidden="true" className="h-px w-8 shrink-0 bg-brand" />
      {children}
    </p>
  )
}

/** One contact line: hairline-ruled row, small icon, no chrome around it. */
function ContactRow({
  href,
  icon,
  children,
  external = false,
  mono = false,
}: Readonly<{
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  external?: boolean
  mono?: boolean
}>) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group flex items-center gap-3 border-b border-line py-3 text-sm text-ink-soft transition-colors last:border-b-0 hover:text-brand dark:border-line-dark dark:text-neutral-400"
    >
      <span aria-hidden="true" className="shrink-0 text-ink-soft/70 transition-colors group-hover:text-brand dark:text-neutral-500">
        {icon}
      </span>
      <span className={`min-w-0 break-all ${mono ? 'tabular font-mono text-xs' : ''}`}>
        {children}
      </span>
      {external && (
        <ArrowUpRight
          aria-hidden="true"
          className="ml-auto h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        />
      )}
    </a>
  )
}

/**
 * The "About" tab of a member's profile.
 *
 * This used to be three shadowed white boxes on grey — the treatment the
 * masthead above it already gave up — with every heading at the same
 * `text-lg font-semibold` and each phone number wrapped in a 40px grey
 * circle. Nothing said which part mattered, and the contact card floated as a
 * mostly empty rectangle next to a full column of text.
 *
 * It is one continuous surface now: sections opened by the mono eyebrow and
 * separated by hairlines, the contact details as a ruled list in a rail that
 * follows the reader down the page.
 */
export function MemberAboutView({ member, labels }: Readonly<MemberAboutViewProps>) {
  const hasPersonalContact = Boolean(member.phone || member.loginEmail)
  const hasCompanyContact = Boolean(member.companyPhone || member.companyEmail || member.website)
  const gallery = member.gallery ?? []

  return (
    <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        {/* About */}
        <section>
          <SectionLabel>{labels.about}</SectionLabel>
          {member.description ? (
            <div
              className="prose max-w-[68ch] overflow-hidden break-words"
              dangerouslySetInnerHTML={{ __html: member.description }}
            />
          ) : (
            <p className="text-sm text-ink-soft/70 dark:text-neutral-500">
              {labels.noDescription}
            </p>
          )}
        </section>

        {/* Company */}
        <section className="mt-12 border-t border-line pt-12 dark:border-line-dark">
          <SectionLabel>{labels.company}</SectionLabel>

          <div className="mb-6 flex items-center gap-5">
            {member.logoUrl ? (
              <Image
                src={member.logoUrl}
                alt={member.company}
                width={112}
                height={112}
                className="h-16 w-16 shrink-0 rounded-xl border border-line bg-white object-contain p-2.5 dark:border-line-dark"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-line dark:border-line-dark">
                <Building2 className="h-6 w-6 text-ink-soft/60 dark:text-neutral-500" aria-hidden="true" />
              </div>
            )}
            {/* The website lives in the contact rail; repeating it here would
                be its third appearance on one screen. */}
            <h3 className="min-w-0 break-words font-display text-2xl font-bold tracking-tight text-ink dark:text-surface-text">
              {member.company}
            </h3>
          </div>

          {member.companyDescription && (
            <div
              className="prose max-w-[68ch] overflow-hidden break-words"
              dangerouslySetInnerHTML={{ __html: member.companyDescription }}
            />
          )}
        </section>

        {/* Gallery */}
        {gallery.length > 0 && (
          <section className="mt-12 border-t border-line pt-12 dark:border-line-dark">
            <SectionLabel>{labels.gallery}</SectionLabel>
            <GalleryLightbox gallery={gallery} />
          </section>
        )}
      </div>

      {/*
        The contact rail. It carries no box of its own — the hairlines between
        the rows are enough structure — and sticks while the description and
        gallery scroll past, which is the one thing the old card could not do.
      */}
      {(hasPersonalContact || hasCompanyContact) && (
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <SectionLabel>{labels.contact}</SectionLabel>

          {hasPersonalContact && (
            <div className="mb-8">
              {labels.personalContact && (
                <h4 className="eyebrow mb-1 text-[0.625rem] opacity-70">
                  {labels.personalContact}
                </h4>
              )}
              {member.phone && (
                <ContactRow href={`tel:${member.phone}`} icon={<Phone className="h-4 w-4" />} mono>
                  {member.phone}
                </ContactRow>
              )}
              {member.loginEmail && (
                <ContactRow href={`mailto:${member.loginEmail}`} icon={<Mail className="h-4 w-4" />}>
                  {member.loginEmail}
                </ContactRow>
              )}
            </div>
          )}

          {hasCompanyContact && (
            <div>
              {labels.companyContact && hasPersonalContact && (
                <h4 className="eyebrow mb-1 text-[0.625rem] opacity-70">
                  {labels.companyContact}
                </h4>
              )}
              {member.companyPhone && (
                <ContactRow
                  href={`tel:${member.companyPhone}`}
                  icon={<Phone className="h-4 w-4" />}
                  mono
                >
                  {member.companyPhone}
                </ContactRow>
              )}
              {member.companyEmail && (
                <ContactRow
                  href={`mailto:${member.companyEmail}`}
                  icon={<Mail className="h-4 w-4" />}
                >
                  {member.companyEmail}
                </ContactRow>
              )}
              {member.website && (
                <ContactRow
                  href={`https://${member.website}`}
                  icon={<Globe className="h-4 w-4" />}
                  external
                >
                  {member.website}
                </ContactRow>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  )
}
