import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import es from "./es.json"
import en from "./en.json"

export const LANG_KEY = "patty-lang"
export const SUPPORTED_LANGS = ["es", "en"] as const
export type AppLang = (typeof SUPPORTED_LANGS)[number]

export function initialLang(): AppLang {
  try {
    const v = localStorage.getItem(LANG_KEY)
    if (v === "es" || v === "en") return v
  } catch {
    /* noop */
  }
  return "es"
}

export function applyLanguage(lng: AppLang) {
  try {
    localStorage.setItem(LANG_KEY, lng)
  } catch {
    /* noop */
  }
  void i18n.changeLanguage(lng)
}

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: initialLang(),
  fallbackLng: "es",
  interpolation: { escapeValue: false },
})

export default i18n
