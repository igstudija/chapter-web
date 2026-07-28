import 'dotenv/config'
import { getPayload } from 'payload'
import config from './src/payload.config'
import { mediaReferenceMap } from './src/lib/mediaUsage'

const payload = await getPayload({ config })

for (const [slug, paths] of mediaReferenceMap(payload)) {
  const where = { or: paths.map((path) => ({ [path]: { in: [1] } })) }
  for (const draft of [false, true]) {
    try {
      await payload.find({ collection: slug, where, draft, depth: 0, limit: 0, pagination: false })
      console.log(`ok   ${slug} draft=${draft} [${paths.join(', ')}]`)
    } catch (error) {
      console.log(`FAIL ${slug} draft=${draft}: ${(error as Error).message}`)
    }
  }
}

process.exit(0)
