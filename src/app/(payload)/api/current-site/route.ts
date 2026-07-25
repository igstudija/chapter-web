import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSiteFromHost } from '@/lib/getSiteFromHost'

export async function GET() {
  const headers = await getHeaders()
  const host = headers.get('host')
  const site = await getSiteFromHost(host)

  if (!site) {
    return NextResponse.json({ siteId: null })
  }

  return NextResponse.json({ siteId: site.id, siteName: site.name })
}
