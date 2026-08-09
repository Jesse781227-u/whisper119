import { type ReactNode } from "react"
import { formatPrice } from "@/lib/utils"
import { useLocalCurrency } from "@/hooks/use-local-currency"

type ConvertedPriceProps = {
  amountNgn: number
  hideBase?: boolean
  className?: string
  children?: ReactNode
}

export function ConvertedPrice({ amountNgn, hideBase = false, className = "" }: ConvertedPriceProps) {
  const { locale, targetCurrency, rate } = useLocalCurrency()
  const basePrice = formatPrice(amountNgn, "NGN", locale)
  const localPrice = rate && targetCurrency ? formatPrice(amountNgn * rate, targetCurrency, locale) : null

  if (hideBase || !localPrice || targetCurrency === "NGN") {
    return <span className={className}>{basePrice}</span>
  }

  return (
    <span className={className}>
      {basePrice} <span className="text-[0.92em] text-muted-foreground">≈ {localPrice}</span>
    </span>
  )
}
