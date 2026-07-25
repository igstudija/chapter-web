import { headers as getHeaders } from 'next/headers'
import { getSettings } from '@/lib/getSiteSettings'
import { NextResponse } from 'next/server'

export async function GET() {
  const headers = await getHeaders()
  const host = headers.get('host')
  const site = await getSettings()

  if (!site) {
    return NextResponse.json({ siteId: null })
  }

  return NextResponse.json({ siteId: site.id, siteName: site.siteName })
}
