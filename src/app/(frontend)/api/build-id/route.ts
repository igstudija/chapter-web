import { NextResponse } from 'next/server'

// Build ID is generated at build time and stays constant for the lifetime of this deployment
const BUILD_ID = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export async function GET() {
  return NextResponse.json({ buildId: BUILD_ID }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
