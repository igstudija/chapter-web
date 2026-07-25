'use client'

import { useState } from 'react'
import { Button, useListQuery, useTranslation } from '@payloadcms/ui'

type Props = {
  collectionSlug: string
}

const ExportToExcelButton = ({ collectionSlug }: Props) => {
  const { query } = useListQuery()
  const { i18n } = useTranslation()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const res = await fetch(`/api/admin/export-excel/${collectionSlug}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          where: query?.where,
          sort: query?.sort,
          search: query?.search,
        }),
      })

      if (!res.ok) {
        let message = `Export failed (${res.status})`
        try {
          const data = (await res.json()) as { error?: string }
          if (data?.error) message = data.error
        } catch {
          // ignore — keep generic message
        }
        alert(message)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      const a = document.createElement('a')
      a.href = url
      a.download = `${collectionSlug}-${stamp}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed', error)
      alert(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const label =
    i18n?.language === 'lv' ? 'Eksportēt uz Excel' : 'Export to Excel'

  return (
    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
      <Button
        buttonStyle="secondary"
        size="small"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? `${label}…` : label}
      </Button>
    </div>
  )
}

export default ExportToExcelButton
