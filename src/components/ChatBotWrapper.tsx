import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isUserAdmin, type UserWithContext } from '@/lib/userHelpers'
import { getCurrentSite } from '@/lib/getSiteSettings'
import { ChatBot } from './ChatBot'

export async function ChatBotWrapper() {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) return null

  // Check if AI chat is enabled for this site
  const currentSite = await getCurrentSite()
  if (!currentSite?.enableAiChat) return null

  const payload = await getPayload({ config })

  try {
    const { user } = await payload.auth({
      headers: new Headers({ Authorization: `JWT ${token}` }),
    })

    if (!user) return null

    const userWithContext = user as UserWithContext
    if (!isUserAdmin(userWithContext)) return null

    return <ChatBot />
  } catch {
    return null
  }
}
