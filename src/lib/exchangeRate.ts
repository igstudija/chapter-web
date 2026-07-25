/**
 * EUR/USD Exchange Rate (ECB data via Frankfurter API)
 *
 * Fetches the latest ECB reference rate and caches it in memory for 24 hours.
 * Falls back to a hardcoded rate if the API is unavailable.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const FALLBACK_RATE = 1.08 // conservative EUR→USD fallback

let cachedRate: number | null = null
let cachedAt = 0

/**
 * Get EUR/USD rate (how many USD per 1 EUR).
 * Example: 1.19 means 1 EUR = 1.19 USD.
 */
export async function getEurUsdRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedRate
  }

  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD', {
      next: { revalidate: 86400 },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rate = data?.rates?.USD
    if (typeof rate === 'number' && rate > 0) {
      cachedRate = rate
      cachedAt = Date.now()
      return rate
    }
    throw new Error('Invalid rate data')
  } catch (err) {
    console.warn('[ExchangeRate] Failed to fetch ECB rate, using fallback:', err)
    return cachedRate ?? FALLBACK_RATE
  }
}

/** Convert USD amount to EUR */
export function usdToEur(usd: number, eurUsdRate: number): number {
  return usd / eurUsdRate
}
