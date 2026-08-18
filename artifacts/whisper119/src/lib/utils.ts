import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number, currency?: string | null, locale = "en-US") {
  const safeCurrency = (currency && typeof currency === "string" && currency.trim()) ? currency.trim().toUpperCase() : "USD"
  const safeAmount = typeof amount === "number" ? (isNaN(amount) ? 0 : amount) : (Number(amount) || 0)
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeCurrency,
    }).format(safeAmount)
  } catch {
    return `$${safeAmount.toFixed(2)}`
  }
}

export function formatDate(dateString?: string | null) {
  if (!dateString) return "N/A"
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

