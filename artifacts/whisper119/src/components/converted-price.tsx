import { formatPrice } from "@/lib/utils"
import { useRegion } from "@/hooks/use-region"
import { useUsdToNgn } from "@/hooks/use-usd-to-ngn"

type ConvertedPriceProps = {
  amountUsd: number
  /**
   * Show the approximate naira amount after the USD price. Only takes effect
   * for visitors in (or who chose) Nigeria. Use on the book page, cart and
   * checkout — never on cards.
   */
  showLocal?: boolean
  className?: string
}

/** Naira rounded to the nearest ₦50 with no kobo: the rate moves daily. */
export function formatApproxNgn(amountNgn: number) {
  const rounded = Math.round(amountNgn / 50) * 50
  return `₦${rounded.toLocaleString("en-NG")}`
}

export function ConvertedPrice({ amountUsd, showLocal = false, className = "" }: ConvertedPriceProps) {
  const { isNigeria } = useRegion()
  const { rate } = useUsdToNgn()
  const usd = formatPrice(amountUsd, "USD", "en-US")
  const ngn = showLocal && isNigeria && rate ? formatApproxNgn(amountUsd * rate) : null

  return (
    <span className={className}>
      <span className="font-extrabold">{usd}</span>
      {ngn && (
        <span className="ml-1.5 whitespace-nowrap text-[0.6em] font-semibold text-muted-foreground align-middle">
          · ≈ {ngn}
        </span>
      )}
    </span>
  )
}
