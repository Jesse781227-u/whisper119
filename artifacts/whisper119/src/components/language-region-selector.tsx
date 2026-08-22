import { useEffect, useState } from "react"

const languages = [["en", "English"], ["fr", "Français"], ["de", "Deutsch"], ["ru", "Русский"], ["it", "Italiano"], ["es", "Español"]] as const
const regions = [["NG", "Nigeria"], ["US", "United States"], ["GB", "United Kingdom"], ["CA", "Canada"], ["ZA", "South Africa"], ["FR", "France"]] as const

export function LanguageRegionSelector() {
  const [language, setLanguage] = useState("en")
  const [region, setRegion] = useState("NG")

  useEffect(() => {
    const savedLanguage = localStorage.getItem("whisper-language") ?? "en"
    setLanguage(languages.some(([code]) => code === savedLanguage) ? savedLanguage : "en")
    setRegion(localStorage.getItem("whisper-region") ?? "NG")
  }, [])

  function updateLanguage(value: string) {
    setLanguage(value)
    localStorage.setItem("whisper-language", value)
    document.documentElement.lang = value
  }

  function updateRegion(value: string) {
    setRegion(value)
    localStorage.setItem("whisper-region", value)
  }

  return <div className="flex items-center gap-2 text-xs"><label className="sr-only" htmlFor="site-language">Language</label><select id="site-language" value={language} onChange={(event) => updateLanguage(event.target.value)} className="rounded-full border border-border bg-background px-2.5 py-1.5 font-semibold"><option value="en">Language</option>{languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><label className="sr-only" htmlFor="site-region">Region</label><select id="site-region" value={region} onChange={(event) => updateRegion(event.target.value)} className="hidden rounded-full border border-border bg-background px-2.5 py-1.5 font-semibold sm:block"><option value="NG">Region</option>{regions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></div>
}
