'use client'

import React from 'react'

const PolicyPlaceholderHelp: React.FC = () => {
  const placeholders = [
    { placeholder: '{site-name}', description: 'Nodaļas nosaukums' },
    { placeholder: '{site-email}', description: 'Kontakta e-pasts' },
    { placeholder: '{site-domain}', description: 'Domēna vārds' },
    { placeholder: '{current-date}', description: 'Šodienas datums' },
    { placeholder: '{last-updated}', description: 'Pēdējās izmaiņas' },
  ]

  return (
    <div className="field-type ui" style={{ marginTop: '1rem' }}>
      <div
        style={{
          padding: '1rem',
          background: 'var(--theme-elevation-100)',
          borderRadius: '4px',
        }}
      >
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem' }}>Pieejamie placeholderi:</h4>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '0.8rem' }}>
          {placeholders.map(({ placeholder, description }) => (
            <li key={placeholder} style={{ marginBottom: '0.5rem' }}>
              <code
                style={{
                  background: 'var(--theme-elevation-200)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                }}
              >
                {placeholder}
              </code>
              <span style={{ marginLeft: '0.5rem', color: 'var(--theme-elevation-600)' }}>
                — {description}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default PolicyPlaceholderHelp
