'use client'

import { SelectField, useField } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'

// Reads the same NEXT_PUBLIC_SUPERADMIN_HOSTS list the server and middleware
// use, so the option this control offers cannot disagree with what access
// control will actually accept.
import { isSuperadminHost } from '@/lib/constants'

/**
 * Custom Role Select component that filters out "superadmin" option
 * when not on the superadmin panel.
 */
export const RoleSelect: SelectFieldClientComponent = (props) => {
  const { field, path } = props
  const { value, setValue } = useField<string>({ path })

  // Check if we're on superadmin panel
  const isSuperadminPanel =
    typeof window !== 'undefined' && isSuperadminHost(window.location.hostname)

  // Filter options based on panel
  const filteredOptions = isSuperadminPanel
    ? field.options
    : field.options?.filter((opt) => {
        if (typeof opt === 'object' && 'value' in opt) {
          return opt.value !== 'superadmin'
        }
        return opt !== 'superadmin'
      })

  // Create modified field with filtered options
  const modifiedField = {
    ...field,
    options: filteredOptions,
  }

  return <SelectField {...props} field={modifiedField} />
}

export default RoleSelect
