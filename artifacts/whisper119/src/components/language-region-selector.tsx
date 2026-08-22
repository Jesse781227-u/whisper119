import { useEffect, useState } from "react"

const languages = [["en", "English"], ["fr", "Français"], ["es", "Español"], ["de", "Deutsch"], ["pt", "Português"], ["ar", "العربية"], ["yo", "Yorùbá"], ["ig", "Igbo"]] as const
const regions = [["NG", "Nigeria"], ["US", "United States"], ["GB", "United Kingdom"], ["CA", "Canada"], ["ZA", "South Africa"], ["FR", "France"]] as const

export function LanguageRegionSelector() {
  const [language, setLanguage] = useState("en")
  const [region, setRegion] = useState("NG")

  useEffect(() => {
    setLanguage(localStorage.getItem("whisper-language") ?? "en")
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
