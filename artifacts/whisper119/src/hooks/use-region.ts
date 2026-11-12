import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

const STORAGE_KEY = "whisper-region"
const CHANGE_EVENT = "whisper-region-change"

function readOverride(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

async function fetchCountry(): Promise<string | null> {
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "").replace(/\/api$/i, "")
  const response = await fetch(`${apiBase}/api/geo`)
  if (!response.ok) return null
  const body = (await response.json()) as { country?: string | null }
  return body.country?.toUpperCase() ?? null
}

/** Saves a manual region choice; `null` returns to the detected country. */
export function setRegionOverride(code: string | null) {
  try {
    if (code) localStorage.setItem(STORAGE_KEY, code)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this page only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/**
 * The visitor's region: a manual choice if they made one, otherwise the
 * country Cloudflare detected. `isNigeria` controls whether NGN is shown.
 */
export function useRegion() {
  const [override, setOverride] = useState(readOverride)
  const { data: detected } = useQuery({
    queryKey: ["geo-country"],
    queryFn: fetchCountry,
    staleTime: Infinity,
    retry: 1,
  })

  useEffect(() => {
    const update = () => setOverride(readOverride())
    window.addEventListener(CHANGE_EVENT, update)
    return () => window.removeEventListener(CHANGE_EVENT, update)
  }, [])

  const region = override ?? detected ?? null
  return { region, detected: detected ?? null, isManual: Boolean(override), isNigeria: region === "NG" }
}
