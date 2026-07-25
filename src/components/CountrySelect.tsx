'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { getCountries, Country } from 'react-phone-number-input'
import en from 'react-phone-number-input/locale/en'

type CountryCode = Country

// Country flag via Twemoji CDN (same approach as PhoneInput)
function CountryFlag({ country, className }: { country: CountryCode; className?: string }) {
  const getFlagUrl = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => (127397 + char.charCodeAt(0)).toString(16))
      .join('-')
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints}.svg`
  }
  return (
    <img
      src={getFlagUrl(country)}
      alt={country}
      className={className || 'w-5 h-4 object-contain'}
      loading="lazy"
    />
  )
}

// Baltic and common European countries first (mirrors PhoneInput ordering)
const PRIORITY_COUNTRIES: CountryCode[] = ['LV', 'LT', 'EE', 'PL', 'DE', 'GB', 'US', 'RU', 'FI', 'SE']

interface CountrySelectProps {
  /** Selected ISO 3166-1 alpha-2 country code (e.g. "LV"), or empty string. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  id?: string
}

export function CountrySelect({
  value,
  onChange,
  placeholder = 'Select a country',
  searchPlaceholder = 'Search...',
  id,
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const allCountries = getCountries()
  const enLocale = en as Record<string, string>
  const selected = value && allCountries.includes(value as CountryCode) ? (value as CountryCode) : null

  const sortedCountries = [
    ...PRIORITY_COUNTRIES.filter((c) => allCountries.includes(c)),
    ...allCountries
      .filter((c) => !PRIORITY_COUNTRIES.includes(c))
      .sort((a, b) => (enLocale[a] || a).localeCompare(enLocale[b] || b)),
  ]

  const filteredCountries = search
    ? sortedCountries.filter((country) => {
        const name = enLocale[country] || country
        return (
          name.toLowerCase().includes(search.toLowerCase()) ||
          country.toLowerCase().includes(search.toLowerCase())
        )
      })
    : sortedCountries

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && searchInputRef.current) searchInputRef.current.focus()
  }, [isOpen])

  const handleSelect = (country: CountryCode) => {
    onChange(country)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 border border-neutral-300 dark:border-neutral-600 dark:bg-surface text-neutral-900 dark:text-surface-text rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
      >
        {selected ? (
          <>
            <CountryFlag country={selected} />
            <span className="flex-1 text-left truncate">{enLocale[selected] || selected}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-neutral-400">{placeholder}</span>
        )}
        {selected && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-neutral-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg max-h-72 overflow-hidden">
          <div className="p-2 border-b border-neutral-200 dark:border-neutral-600">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
            />
          </div>
          <div className="overflow-y-auto max-h-56">
            {filteredCountries.map((country) => (
              <button
                key={country}
                type="button"
                onClick={() => handleSelect(country)}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left ${
                  selected === country ? 'bg-neutral-100 dark:bg-neutral-700' : ''
                }`}
              >
                <CountryFlag country={country} />
                <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">
                  {enLocale[country] || country}
                </span>
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <div className="px-3 py-4 text-sm text-neutral-400 text-center">—</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
