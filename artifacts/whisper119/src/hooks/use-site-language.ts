import { useEffect, useState } from "react"

export const languages = [
  ["af", "Afrikaans"], ["sq", "Albanian"], ["am", "Amharic"], ["ar", "Arabic"], ["hy", "Armenian"], ["az", "Azerbaijani"],
  ["eu", "Basque"], ["be", "Belarusian"], ["bn", "Bengali"], ["bs", "Bosnian"], ["bg", "Bulgarian"], ["my", "Burmese"],
  ["ca", "Catalan"], ["zh", "Chinese"], ["hr", "Croatian"], ["cs", "Czech"], ["da", "Danish"], ["nl", "Dutch"],
  ["en", "English"], ["et", "Estonian"], ["fi", "Finnish"], ["fr", "French"], ["gl", "Galician"], ["ka", "Georgian"],
  ["de", "German"], ["el", "Greek"], ["gu", "Gujarati"], ["he", "Hebrew"], ["hi", "Hindi"], ["hu", "Hungarian"],
  ["is", "Icelandic"], ["id", "Indonesian"], ["ga", "Irish"], ["it", "Italian"], ["ja", "Japanese"], ["kn", "Kannada"],
  ["kk", "Kazakh"], ["km", "Khmer"], ["ko", "Korean"], ["ky", "Kyrgyz"], ["lo", "Lao"], ["lv", "Latvian"],
  ["lt", "Lithuanian"], ["mk", "Macedonian"], ["ms", "Malay"], ["ml", "Malayalam"], ["mt", "Maltese"], ["mr", "Marathi"],
  ["mn", "Mongolian"], ["ne", "Nepali"], ["no", "Norwegian"], ["fa", "Persian"], ["pl", "Polish"], ["pt", "Portuguese"],
  ["pa", "Punjabi"], ["ro", "Romanian"], ["ru", "Russian"], ["sr", "Serbian"], ["sk", "Slovak"], ["sl", "Slovenian"],
  ["so", "Somali"], ["es", "Spanish"], ["sw", "Swahili"], ["sv", "Swedish"], ["tl", "Tagalog"], ["tg", "Tajik"],
  ["ta", "Tamil"], ["te", "Telugu"], ["th", "Thai"], ["tr", "Turkish"], ["tk", "Turkmen"], ["uk", "Ukrainian"],
  ["ur", "Urdu"], ["uz", "Uzbek"], ["vi", "Vietnamese"], ["cy", "Welsh"], ["yo", "Yoruba"], ["zu", "Zulu"],
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
