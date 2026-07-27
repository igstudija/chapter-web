import { getPayload } from 'payload'
import { getSettings } from '@/lib/getSiteSettings'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getMessages, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSlideshowData } from '@/lib/getSlideshowData'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const headers = await getHeaders()
    const host = headers.get('host')

    const site = await getSettings()

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const data = await getSlideshowData(payload, site)
    if (!data) {
      return NextResponse.json({ error: 'Slideshow settings not found' }, { status: 404 })
    }

    const locale = (site.locale || DEFAULT_LOCALE) as Locale
    const messages = getMessages(locale)
    const slideshowTranslations = messages.slideshow

    return NextResponse.json({
      ...data,
      locale,
      translations: slideshowTranslations,
    })
  } catch (error) {
    console.error('Error fetching slides data:', error)
    return NextResponse.json({ error: 'Failed to fetch slides data' }, { status: 500 })
  }
}
