type ExchangeRateCache = {
  base: string
  rates: Record<string, number>
  updatedAt: number
}

// Keep the provider configurable, but use the open ExchangeRate-API endpoint
// by default. The old exchangerate.host endpoint now commonly requires an API
// key and returns a different error payload for unauthenticated requests.
const API_URL = process.env.EXCHANGE_RATE_API_URL ?? "https://open.er-api.com/v6/latest/USD"
const CACHE_TTL_MS = 60 * 60 * 1000
let cache: ExchangeRateCache | null = null

async function fetchRatesFromProvider(): Promise<Omit<ExchangeRateCache, "updatedAt">> {
  const response = await fetch(API_URL)
  if (!response.ok) {
    throw new Error(`Exchange rate API request failed with status ${response.status}`)
  }

  const json = await response.json() as {
    result?: string
    base?: string
    base_code?: string
    rates?: unknown
  }
  if (!json || typeof json !== "object" || json.result === "error" || typeof json.rates !== "object" || json.rates === null) {
    throw new Error("Unexpected exchange rate response format")
  }

  const providerBase = (json.base_code ?? json.base)?.toUpperCase()
  const providerRates = json.rates as Record<string, unknown>
  if (!providerBase) {
    throw new Error("Exchange rate response is missing its base currency")
  }

  // The API serves rates from NGN because that is the contract exposed to the
  // storefront. For the default USD-based feed, convert each quote to NGN.
  const ngnPerProviderBase = providerBase === "NGN" ? 1 : providerRates.NGN
  if (typeof ngnPerProviderBase !== "number" || !Number.isFinite(ngnPerProviderBase) || ngnPerProviderBase <= 0) {
    throw new Error("Exchange rate response is missing an NGN rate")
  }

  const rates: Record<string, number> = { NGN: 1 }
  for (const [currency, value] of Object.entries(providerRates)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      rates[currency.toUpperCase()] = value / ngnPerProviderBase
    }
  }

  return {
    base: "NGN",
    rates,
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
