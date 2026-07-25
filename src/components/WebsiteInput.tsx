'use client'

interface WebsiteInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
}

/**
 * Sanitize website URL input:
 * - Remove http:// or https:// prefix
 * - Remove leading/trailing whitespace
 * - Remove any spaces within the URL
 */
function sanitizeWebsiteValue(input: string): string {
  return input
    .replace(/^https?:\/\//i, '') // Remove http:// or https://
    .replace(/\s+/g, '') // Remove all whitespace
    .trim()
}

export function WebsiteInput({
  value,
  onChange,
  placeholder = 'example.com',
  id,
}: WebsiteInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeWebsiteValue(e.target.value)
    onChange(sanitized)
  }

  return (
    <div className="flex w-full">
      <span className="flex items-center px-3 py-2 border border-r-0 border-neutral-300 dark:border-neutral-600 rounded-l-lg bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-600 dark:text-neutral-300 select-none">
        https://
      </span>
      <input
        type="text"
        id={id}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex-1 border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
      />
    </div>
  )
}
