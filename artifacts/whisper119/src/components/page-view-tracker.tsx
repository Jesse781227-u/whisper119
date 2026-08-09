import { useEffect } from "react"
import { useLocation } from "wouter"
import { useRecordPageView } from "@workspace/api-client-react"

const visitorKey = "whisper119-anonymous-visitor"

function getVisitorId() {
  try {
    const existing = localStorage.getItem(visitorKey)
    if (existing) return existing
    const generated = globalThis.crypto?.randomUUID?.() ?? `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(visitorKey, generated)
    return generated
  } catch {
    return null
  }
}

export function PageViewTracker() {
  const [pathname] = useLocation()
  const recordPageView = useRecordPageView()

  useEffect(() => {
    recordPageView.mutate({ data: { path: pathname, visitorId: getVisitorId() } }, {
      onError: () => undefined,
    })
  }, [pathname])

  return null
}