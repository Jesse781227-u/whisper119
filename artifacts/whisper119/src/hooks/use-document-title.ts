import { useEffect } from "react"

const SITE = "Whisper 119"

/** Sets `<title>` to "{page} — Whisper 119", or just the site name. */
export function useDocumentTitle(page?: string | null) {
  useEffect(() => {
    document.title = page ? `${page} — ${SITE}` : `${SITE} — Romance ebooks by Whisper 119`
  }, [page])
}
