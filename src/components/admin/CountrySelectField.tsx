'use client'

import { SelectField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { getCountries } from 'react-phone-number-input'
import en from 'react-phone-number-input/locale/en'

const enLocale = en as Record<string, string>

// Baltic and common European countries first (mirrors the member-profile CountrySelect)
const PRIORITY_COUNTRIES: string[] = ['LV', 'LT', 'EE', 'PL', 'DE', 'GB', 'US', 'RU', 'FI', 'SE']

const allCountries = getCountries() as string[]

// Searchable classifier: label = localized country name, value = ISO alpha-2 code.
const COUNTRY_OPTIONS = [
  ...PRIORITY_COUNTRIES.filter((c) => allCountries.includes(c)),
  ...allCountries
    .filter((c) => !PRIORITY_COUNTRIES.includes(c))
    .sort((a, b) => (enLocale[a] || a).localeCompare(enLocale[b] || b)),
].map((c) => ({ label: enLocale[c] || c, value: c }))

/**
 * Admin field for `country` on site memberships. Renders Payload's native
 * (searchable) select populated with the country classifier so admins can pick
 * a country by name instead of memorising ISO codes. The value is still stored
 * as a plain text ISO 3166-1 alpha-2 code — same as the member-profile field.
 */
export const CountrySelectField: TextFieldClientComponent = (props) => {
  const { field } = props
  const selectField = {
    ...field,
    type: 'select',
    options: COUNTRY_OPTIONS,
    hasMany: false,
  }
  // The text-field and select-field client prop shapes are compatible at runtime;
  // SelectField only needs `field.options`, `path`, and the shared field props.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SelectField {...(props as any)} field={selectField as any} />
}

export default CountrySelectField
