import * as XLSX from 'xlsx'
import { NextResponse } from 'next/server'

export interface ExcelData {
  data: any[]
  columnNames: string[]
}

export async function parseExcelFile(file: File): Promise<ExcelData | NextResponse> {
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<any>(worksheet)
    const columnNames = Object.keys(data[0] || {})

    return { data, columnNames }
  } catch (error) {
    console.error('Failed to parse Excel file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to parse Excel file', details: errorMessage },
      { status: 400 },
    )
  }
}
