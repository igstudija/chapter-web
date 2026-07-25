import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  type ColumnMapping,
  type ImportResult,
  mapRowData,
  processUserRow,
  getEmailFromRawRow,
} from './helpers'
import {
  validateAuthentication,
  validateFile,
  validateSiteId,
  validateSiteExists,
  validateExcelData,
} from './validation'
import { parseExcelFile } from './excel-parser'

async function processImport(
  payload: any,
  data: any[],
  mapping: ColumnMapping,
  siteId: number,
): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  for (let i = 0; i < data.length; i++) {
    const rawRow = data[i]
    const rowNumber = i + 2

    try {
      const row = mapRowData(rawRow, mapping)
      await processUserRow(payload, row, siteId)
      result.success++
    } catch (error) {
      result.failed++
      result.errors.push({
        row: rowNumber,
        email: getEmailFromRawRow(rawRow, mapping),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return result
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    const authError = await validateAuthentication(payload, request.headers)
    if (authError) return authError

    const formData = await request.formData()
    const file = formData.get('file') as File
    const siteIdString = formData.get('siteId') as string
    const mappingJson = formData.get('mapping') as string
    const previewOnly = formData.get('previewOnly') === 'true'

    const fileError = validateFile(file)
    if (fileError) return fileError

    const siteIdError = validateSiteId(siteIdString, previewOnly)
    if (siteIdError) return siteIdError

    const siteId: number | undefined = siteIdString ? Number.parseInt(siteIdString, 10) : undefined

    const siteExistsError = await validateSiteExists(payload, siteId, previewOnly)
    if (siteExistsError) return siteExistsError

    const excelResult = await parseExcelFile(file)
    if (excelResult instanceof NextResponse) return excelResult

    const { data, columnNames } = excelResult

    const dataError = validateExcelData(data)
    if (dataError) return dataError

    if (previewOnly) {
      return NextResponse.json({ preview: columnNames })
    }

    const mapping: ColumnMapping = mappingJson ? JSON.parse(mappingJson) : {}
    const result = await processImport(payload, data, mapping, siteId!)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import users' },
      { status: 500 },
    )
  }
}
