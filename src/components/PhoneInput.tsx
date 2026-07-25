'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { getCountries, getCountryCallingCode, Country } from 'react-phone-number-input'
// Country is the CountryCode type from react-phone-number-input
type CountryCode = Country
import en from 'react-phone-number-input/locale/en'

// Country flag component using Twemoji CDN
function CountryFlag({ country, className }: { country: CountryCode; className?: string }) {
  // Convert country code to regional indicator symbols, then to Twemoji URL
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

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
}

// Baltic and common European countries first
const PRIORITY_COUNTRIES: CountryCode[] = ['LV', 'LT', 'EE', 'PL', 'DE', 'GB', 'US', 'RU', 'FI', 'SE']

function parsePhoneNumber(phone: string): { countryCode: CountryCode; number: string } {
  if (!phone) return { countryCode: 'LV', number: '' }

  const cleaned = phone.replace(/[\s\-()]/g, '')

  // Try to match country code from all countries
  const countries = getCountries()
  for (const country of countries) {
    try {
      const dialCode = getCountryCallingCode(country)
      if (cleaned.startsWith('+' + dialCode)) {
        const numberPart = cleaned.slice(1 + dialCode.length)
        return { countryCode: country, number: numberPart }
      }
    } catch {
      continue
    }
  }

  // Default to Latvia
  if (cleaned.startsWith('+')) {
    return { countryCode: 'LV', number: cleaned.slice(1) }
  }

  return { countryCode: 'LV', number: cleaned }
}

export function PhoneInput({ value, onChange, placeholder = '20000000', id }: PhoneInputProps) {
  const parsed = parsePhoneNumber(value)
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(parsed.countryCode)
  const [localNumber, setLocalNumber] = useState(parsed.number)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Get all countries sorted with priority countries first
  const allCountries = getCountries()
  const enLocale = en as Record<string, string>
  const sortedCountries = [
    ...PRIORITY_COUNTRIES.filter((c) => allCountries.includes(c)),
    ...allCountries.filter((c) => !PRIORITY_COUNTRIES.includes(c)).sort((a, b) => {
      const nameA = enLocale[a] || a
      const nameB = enLocale[b] || b
      return nameA.localeCompare(nameB)
    }),
  ]

  const filteredCountries = search
    ? sortedCountries.filter((country) => {
        const name = enLocale[country] || country
        return name.toLowerCase().includes(search.toLowerCase()) || country.toLowerCase().includes(search.toLowerCase())
      })
    : sortedCountries

  useEffect(() => {
    const parsed = parsePhoneNumber(value)
    setSelectedCountry(parsed.countryCode)
    setLocalNumber(parsed.number)
  }, [value])

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
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const cleanedInput = inputValue.replace(/[^\d]/g, '')

    // Check if user pasted a full number with country code
    if (inputValue.startsWith('+') || inputValue.length > 12) {
      const parsed = parsePhoneNumber(inputValue)
      setSelectedCountry(parsed.countryCode)
      setLocalNumber(parsed.number)
      try {
        const dialCode = getCountryCallingCode(parsed.countryCode)
        onChange(`+${dialCode}${parsed.number}`)
      } catch {
        onChange(`+371${parsed.number}`)
      }
      return
    }

    setLocalNumber(cleanedInput)
    if (cleanedInput) {
      try {
        const dialCode = getCountryCallingCode(selectedCountry)
        onChange(`+${dialCode}${cleanedInput}`)
      } catch {
        onChange(`+371${cleanedInput}`)
      }
    } else {
      onChange('')
    }
  }

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country)
    setIsOpen(false)
    setSearch('')
    if (localNumber) {
      try {
        const dialCode = getCountryCallingCode(country)
        onChange(`+${dialCode}${localNumber}`)
      } catch {
        onChange(`+371${localNumber}`)
      }
    }
  }

  let dialCode = '371'
  try {
    dialCode = getCountryCallingCode(selectedCountry)
  } catch {
    // Keep default
  }

  return (
    <div className="flex w-full">
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 border border-r-0 border-neutral-300 dark:border-neutral-600 rounded-l-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 h-full min-w-[5.5rem]"
        >
          <CountryFlag country={selectedCountry} />
          <span className="text-sm text-neutral-600 dark:text-neutral-300">+{dialCode}</span>
          <ChevronDown className="h-3 w-3 text-neutral-400" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-72 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg max-h-72 overflow-hidden">
            <div className="p-2 border-b border-neutral-200 dark:border-neutral-600">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
              />
            </div>
            <div className="overflow-y-auto max-h-56">
              {filteredCountries.map((country) => {
                let countryDialCode = ''
                try {
                  countryDialCode = getCountryCallingCode(country)
                } catch {
                  return null
                }
                return (
                  <button
                    key={country}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left ${
                      selectedCountry === country ? 'bg-neutral-100 dark:bg-neutral-700' : ''
                    }`}
                  >
                    <CountryFlag country={country} />
                    <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">
                      {enLocale[country] || country}
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      +{countryDialCode}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <input
        type="tel"
        id={id}
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        className="flex-1 border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-r-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
      />
    </div>
  )
}
