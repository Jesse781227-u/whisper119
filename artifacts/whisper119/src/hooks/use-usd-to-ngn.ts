import { useQuery } from "@tanstack/react-query"

type ExchangeRateResponse = {
  base: string
  target: string
  rate: number
  updatedAt: string
}

async function fetchUsdRate(): Promise<ExchangeRateResponse> {
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "")
  const response = await fetch(`${apiBase}/api/exchange-rates?target=USD`)
  if (!response.ok) throw new Error("Could not load the current exchange rate")
  return response.json() as Promise<ExchangeRateResponse>
}

export function useUsdToNgn() {
  const query = useQuery({
    queryKey: ["exchange-rate", "USD", "NGN"],
    queryFn: fetchUsdRate,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })

  const usdPerNgn = query.data?.rate
  const rate = usdPerNgn && usdPerNgn > 0 ? 1 / usdPerNgn : null

  return {
    rate,
    updatedAt: query.data?.updatedAt ? new Date(query.data.updatedAt) : undefined,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

