import type { Payload } from 'payload'
import { NextResponse } from 'next/server'

export async function validateAuthentication(
  payload: Payload,
  headers: Headers,
): Promise<NextResponse | null> {
  const { user } = await payload.auth({ headers })
  if (!user || !user.isSuperadmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export function validateFile(file: File | null): NextResponse | null {
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  return null
}

export function validateSiteId(
  siteIdString: string | null,
  previewOnly: boolean,
): NextResponse | null {
  if (!siteIdString && !previewOnly) {
    return NextResponse.json({ error: 'No site selected' }, { status: 400 })
  }
  return null
}

export async function validateSiteExists(
  payload: Payload,
  siteId: number | undefined,
  previewOnly: boolean,
): Promise<NextResponse | null> {
  if (previewOnly || !siteId) {
    return null
  }

  const site = await payload.findByID({
    collection: 'sites',
    id: siteId,
  })

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  return null
}

export function validateExcelData(data: any[]): NextResponse | null {
  if (data.length === 0) {
    return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
  }
  return null
}
