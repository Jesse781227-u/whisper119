type ExchangeRateCache = {
  base: string
  rates: Record<string, number>
  updatedAt: number
}

const API_URL = process.env.EXCHANGE_RATE_API_URL ?? "https://api.exchangerate.host/latest?base=NGN"
const CACHE_TTL_MS = 60 * 60 * 1000
let cache: ExchangeRateCache | null = null

async function fetchRatesFromProvider(): Promise<Omit<ExchangeRateCache, "updatedAt">> {
  const response = await fetch(API_URL)
  if (!response.ok) {
    throw new Error(`Exchange rate API request failed with status ${response.status}`)
  }

  const json = await response.json() as { base?: string; rates?: unknown }
  if (!json || typeof json !== "object" || json.base !== "NGN" || typeof json.rates !== "object") {
    throw new Error("Unexpected exchange rate response format")
  }

  return {
    base: json.base,
    rates: json.rates as Record<string, number>,
  }
}

export async function getExchangeRates() {
  const now = Date.now()
  if (cache && now - cache.updatedAt < CACHE_TTL_MS) {
    return cache
  }

  try {
    const freshRates = await fetchRatesFromProvider()
    cache = {
      ...freshRates,
      updatedAt: now,
    }
    return cache
  } catch (error) {
    if (cache) {
      return cache
    }
    throw error
  }
}

export function getCachedExchangeRates() {
  return cache
}
