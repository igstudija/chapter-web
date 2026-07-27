/**
 * The "look this company up" row that sits on every prospect — in the Top 40 /
 * Top 20 grid, in the list view, and on each member's own sub-page. It existed
 * four times over as copy-pasted markup, which is how the four copies drifted
 * apart, and one of them pulled the Perplexity glyph from `api.iconify.design`
 * on every render — a third-party request per row, blocked by any strict CSP
 * and blank whenever that host is slow. All four icons are inline now.
 *
 * The buttons are quiet by default and only take the vendor's colour on hover:
 * a list of forty rows should not carry a hundred and twenty coloured dots.
 */

interface ProspectSearchLinksProps {
  /** Free-text query handed to the AI engines. */
  aiQuery: string
  /** Company name, quoted for the plain Google search. */
  companyName: string
  /** Latvian company register number — renders the Lursoft link when present. */
  registrationNumber?: string | null
  /** Tooltip for the Lursoft link (localised by the caller). */
  lursoftLabel?: string
  className?: string
}

function PerplexityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m5.735 2l5.695 5.247V2.012h1.109v5.259L18.259 2v5.983h2.349v8.629h-2.342v5.327l-5.727-5.032v5.09h-1.11V16.99L5.742 22v-5.388H3.393v-8.63h2.342zm4.86 7.078H4.5v6.439h1.24v-2.031zM6.85 13.972v5.585l4.58-4.034V9.81zm5.72 1.497l4.588 4.03v-2.887h-.006v-2.646l-4.582-4.16zm5.696.048H19.5v-6.44h-6.047l4.814 4.363zm-1.115-7.534V4.519l-3.76 3.464zm-6.548 0l-3.76-3.464v3.464z" />
    </svg>
  )
}

function ChatGPTIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4091-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function ProspectSearchLinks({
  aiQuery,
  companyName,
  registrationNumber,
  lursoftLabel,
  className = '',
}: Readonly<ProspectSearchLinksProps>) {
  const encoded = encodeURIComponent(aiQuery)

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <a
        href={`https://www.perplexity.ai/search?q=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="icon-btn hover:!bg-[#20808d]/12 hover:!text-[#20808d]"
        title="Perplexity"
      >
        <PerplexityIcon className="h-3.5 w-3.5" />
      </a>
      <a
        href={`https://chatgpt.com/?q=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="icon-btn hover:!bg-[#10a37f]/12 hover:!text-[#10a37f]"
        title="ChatGPT"
      >
        <ChatGPTIcon className="h-3.5 w-3.5" />
      </a>
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent(`"${companyName}"`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="icon-btn hover:!bg-[#4285f4]/12 hover:!text-[#4285f4]"
        title="Google"
      >
        <GoogleIcon className="h-3.5 w-3.5" />
      </a>
      {registrationNumber && (
        <a
          href={`https://company.lursoft.lv/en/?c=${registrationNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tabular ml-auto pl-2 font-mono text-[11px] text-ink-soft transition-colors hover:text-brand dark:text-neutral-400"
          title={lursoftLabel}
        >
          {registrationNumber}
        </a>
      )}
    </div>
  )
}
