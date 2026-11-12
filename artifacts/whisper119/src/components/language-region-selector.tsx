import { Check, Globe, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { countries } from "@/data/countries"
import { languages, useSiteLanguage } from "@/hooks/use-site-language"
import { setRegionOverride, useRegion } from "@/hooks/use-region"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

/** Languages most of the readership uses, shown above the full A–Z list. */
const POPULAR_LANGUAGES = ["en", "es", "fr", "pt", "de", "it", "tl", "id"] as const
const DISPLAY_NAMES: Record<string, string> = { tl: "Filipino" }

function languageLabel(code: string) {
  return DISPLAY_NAMES[code] ?? languages.find(([value]) => value === code)?.[1] ?? code.toUpperCase()
}

function setSiteLanguage(code: string) {
  try {
    localStorage.setItem("whisper-language", code)
  } catch {
    // Storage unavailable; the event below still updates this page.
  }
  document.documentElement.lang = code
  window.dispatchEvent(new Event("whisper-language-change"))
}

function LanguageList({ onSelected }: { onSelected?: () => void }) {
  const current = useSiteLanguage()
  const [query, setQuery] = useState("")

  const { popular, rest } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (code: string) => !q || languageLabel(code).toLowerCase().includes(q)
    return {
      popular: POPULAR_LANGUAGES.filter(matches),
      rest: languages
        .map(([code]) => code)
        .filter((code) => !(POPULAR_LANGUAGES as readonly string[]).includes(code) && matches(code))
        .sort((a, b) => languageLabel(a).localeCompare(languageLabel(b))),
    }
  }, [query])

  const option = (code: string) => (
    <li key={code}>
      <button
        type="button"
        onClick={() => { setSiteLanguage(code); onSelected?.() }}
        aria-pressed={current === code}
        className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-semibold hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
      >
        {languageLabel(code)}
        {current === code && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
      </button>
    </li>
  )

  return (
    <div className="flex min-h-0 flex-col">
      <label className="relative mb-2 block">
        <span className="sr-only">Search languages</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search languages"
          className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </label>
      <ul className="min-h-0 overflow-y-auto overscroll-contain" aria-label="Languages">
        {popular.map(option)}
        {popular.length > 0 && rest.length > 0 && <li role="separator" className="my-1 border-t border-border" />}
        {rest.map(option)}
        {popular.length === 0 && rest.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">No language matches “{query}”.</li>}
      </ul>
    </div>
  )
}

function RegionSelect() {
  const { region, detected, isManual } = useRegion()
  const detectedName = countries.find(({ code }) => code === detected)?.name
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Region</span>
      <select
        value={isManual ? region ?? "" : ""}
        onChange={(event) => setRegionOverride(event.target.value || null)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold"
      >
        <option value="">{detectedName ? `Automatic (${detectedName})` : "Automatic"}</option>
        {countries.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
      </select>
      <span className="mt-1.5 block text-xs text-muted-foreground">Prices are in USD. Readers in Nigeria also see an approximate naira amount.</span>
    </label>
  )
}

/** Short "EN · NG" label for the current language and region. */
export function useLanguageRegionLabel() {
  const language = useSiteLanguage()
  const { region } = useRegion()
  return `${language.toUpperCase()}${region ? ` · ${region}` : ""}`
}

/** Desktop: one pill that opens a popover with language and region. */
export function LanguageRegionSelector() {
  const label = useLanguageRegionLabel()
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Language and region: ${label}`}
          className="flex h-10 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex max-h-[min(32rem,80vh)] w-80 flex-col gap-4 p-4">
        <div className="flex min-h-0 flex-col">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Language</p>
          <div className="flex max-h-72 min-h-0 flex-col"><LanguageList onSelected={() => setOpen(false)} /></div>
        </div>
        <RegionSelect />
      </PopoverContent>
    </Popover>
  )
}

/** Mobile: bottom sheet opened from the menu's "Language & region" row. */
export function LanguageRegionSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[85dvh] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>Language &amp; region</DrawerTitle>
          <DrawerDescription>Choose the language you read in and where you are.</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col"><LanguageList onSelected={() => onOpenChange(false)} /></div>
          <RegionSelect />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
