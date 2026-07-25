'use client'

import { useField, TextareaField, useDocumentInfo, useForm } from '@payloadcms/ui'
import type { TextareaFieldClientComponent } from 'payload'
import { useState, useCallback } from 'react'

export const BusinessTagsField: TextareaFieldClientComponent = (props) => {
  const { path } = props
  const { value, setValue } = useField<string>({ path })
  const { id } = useDocumentInfo()
  const { getData } = useForm()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Get current form data
      const formData = getData()
      const companyName = formData.companyName as string
      const contactPerson = formData.contactPerson as string
      const position = formData.position as string
      const registrationNumber = formData.registrationNumber as string
      const notes = formData.notes as string

      if (!companyName) {
        setError('Uzņēmuma nosaukums ir obligāts')
        setIsGenerating(false)
        return
      }

      const response = await fetch('/api/superadmin/generate-single-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          contactPerson,
          position,
          registrationNumber,
          notes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kļūda ģenerējot tagus')
      }

      const data = await response.json()
      if (data.tags) {
        setValue(data.tags)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nezināma kļūda')
    } finally {
      setIsGenerating(false)
    }
  }, [getData, setValue])

  return (
    <div>
      <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            padding: '6px 12px',
            backgroundColor: isGenerating ? '#666' : '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          {isGenerating ? '⏳ Ģenerē...' : '✨ Generate with Perplexity'}
        </button>
        {error && (
          <span style={{ color: '#ef4444', fontSize: '12px' }}>{error}</span>
        )}
      </div>
      <TextareaField {...props} />
    </div>
  )
}

export default BusinessTagsField
