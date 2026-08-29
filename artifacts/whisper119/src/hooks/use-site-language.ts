import { useEffect, useState } from "react"

export const languages = [
  ["en", "English"], ["fr", "Français"], ["de", "Deutsch"],
  ["ru", "Русский"], ["it", "Italiano"], ["es", "Español"],
] as const

export function useSiteLanguage() {
  const [language, setLanguage] = useState(() => localStorage.getItem("whisper-language") ?? "en")
  useEffect(() => {
    const update = () => setLanguage(localStorage.getItem("whisper-language") ?? "en")
    window.addEventListener("whisper-language-change", update)
    return () => window.removeEventListener("whisper-language-change", update)
  }, [])
  return languages.some(([code]) => code === language) ? language : "en"
}
