import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/getSiteSettings'
import { getMessages, type Locale, DEFAULT_LOCALE } from '@/lib/i18n'
import { getSlideshowData } from '@/lib/getSlideshowData'

export async function GET(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  await params
  try {
    const payload = await getPayload({ config })
    const settings = await getSettings()

    if (!settings) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const data = await getSlideshowData(payload, settings)
    if (!data) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    const locale = (settings.locale || DEFAULT_LOCALE) as Locale
    const messages = getMessages(locale)
    const slideshowTranslations = messages.slideshow

    return NextResponse.json({
      ...data,
      locale,
      translations: slideshowTranslations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('Error fetching slide data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch slide data', detail: message, stack },
      { status: 500 },
    )
  }
}
