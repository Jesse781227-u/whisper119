import { useEffect, useState } from "react"
import { countries } from "@/data/countries"
import { languages } from "@/hooks/use-site-language"

export function LanguageRegionSelector() {
  const [language, setLanguage] = useState("en")
  const [region, setRegion] = useState("NG")

  useEffect(() => {
    const savedLanguage = localStorage.getItem("whisper-language") ?? "en"
    setLanguage(languages.some(([code]) => code === savedLanguage) ? savedLanguage : "en")
    const savedRegion = localStorage.getItem("whisper-region") ?? "NG"
    setRegion(countries.some(({ code }) => code === savedRegion) ? savedRegion : "NG")
  }, [])

  function updateLanguage(value: string) {
    setLanguage(value)
    localStorage.setItem("whisper-language", value)
    document.documentElement.lang = value
    window.dispatchEvent(new Event("whisper-language-change"))
  }

  function updateRegion(value: string) {
    setRegion(value)
    localStorage.setItem("whisper-region", value)
  }

  return <div className="flex items-center gap-2 text-xs"><label className="sr-only" htmlFor="site-language">Language</label><select id="site-language" value={language} onChange={(event) => updateLanguage(event.target.value)} className="rounded-full border border-border bg-background px-2.5 py-1.5 font-semibold"><option value="en">Language</option>{languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><label className="sr-only" htmlFor="site-region">Region</label><select id="site-region" value={region} onChange={(event) => updateRegion(event.target.value)} className="hidden rounded-full border border-border bg-background px-2.5 py-1.5 font-semibold sm:block"><option value="NG">Region</option>{countries.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}</select></div>
}
