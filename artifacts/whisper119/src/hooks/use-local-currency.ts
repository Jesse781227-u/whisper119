import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

const REGION_CURRENCY_MAP: Record<string, string> = {
  NG: "NGN",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  EU: "EUR",
  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  IE: "EUR",
  NL: "EUR",
  IN: "INR",
  JP: "JPY",
  CN: "CNY",
  MX: "MXN",
  BR: "BRL",
  ZA: "ZAR",
  SG: "SGD",
}

function parseRegionFromLocale(locale: string): string | undefined {
  const normalized = locale.replace("_", "-").trim()
  const parts = normalized.split("-")
  if (parts.length >= 2 && parts[1].length === 2) {
    return parts[1].toUpperCase()
  }
  if (parts[0].length === 2) {
    return parts[0].toUpperCase()
  }
  return undefined
}

function getLocale() {
  if (typeof navigator === "undefined") {
    return "en-US"
  }
  return navigator.languages?.[0] || navigator.language || "en-US"
}

function getCurrencyForLocale(locale: string) {
  const region = parseRegionFromLocale(locale)
  if (!region) {
    return "USD"
  }
  return REGION_CURRENCY_MAP[region] ?? (region === "EU" ? "EUR" : "USD")
}

async function fetchExchangeRate(target: string) {
    const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "").replace(/\/api$/i, "")
    const response = await fetch(`${apiBase}/api/exchange-rates?target=${encodeURIComponent(target)}`)
  if (!response.ok) {
    throw new Error("Could not load exchange rates")
  }
  return response.json() as Promise<{ base: string; target: string; rate: number; updatedAt: string }>
}

export function useLocalCurrency() {
  const [locale, setLocale] = useState("en-US")
  const [targetCurrency, setTargetCurrency] = useState("USD")

  useEffect(() => {
    const resolvedLocale = getLocale()
    setLocale(resolvedLocale)
    setTargetCurrency(getCurrencyForLocale(resolvedLocale))
  }, [])

  const enabled = targetCurrency !== "NGN"

  const query = useQuery<{ base: string; target: string; rate: number; updatedAt: string }, Error>({
    queryKey: ["exchange-rate", targetCurrency],
    queryFn: () => fetchExchangeRate(targetCurrency),
    enabled,
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  return useMemo(() => ({
    locale,
    targetCurrency,
    rate: query.data?.rate ?? null,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    updatedAt: query.data?.updatedAt ? new Date(query.data.updatedAt) : undefined,
  }), [locale, targetCurrency, query.data, query.isFetching, query.isError, query.error])
}
