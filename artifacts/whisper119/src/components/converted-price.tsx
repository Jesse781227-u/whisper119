import { type ReactNode } from "react"
import { formatPrice } from "@/lib/utils"
import { useUsdToNgn } from "@/hooks/use-usd-to-ngn"

type ConvertedPriceProps = {
  amountUsd: number
  hideBase?: boolean
  className?: string
  children?: ReactNode
}

export function ConvertedPrice({ amountUsd, hideBase = false, className = "" }: ConvertedPriceProps) {
  const { rate } = useUsdToNgn()
  const basePrice = formatPrice(amountUsd, "USD", "en-US")
  const localPrice = rate ? formatPrice(amountUsd * rate, "NGN", "en-NG") : null

  if (hideBase || !localPrice) {
    return <span className={className}>{basePrice}</span>
  }

  return (
    <span className={className}>
      {basePrice} <span className="text-[0.92em] text-muted-foreground">≈ {localPrice}</span>
    </span>
  )
}
