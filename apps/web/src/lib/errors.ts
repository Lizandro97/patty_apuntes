// Maps a backend error `detail` ({code, message} or legacy string)
// to the active language. `t` is the i18next function (useTranslation or i18n.t).
export function apiError(
  t: (key: string) => string,
  detail: unknown,
  fallbackKey = "errors.fallback",
): string {
  if (detail && typeof detail === "object") {
    const d = detail as { code?: string; message?: string }
    if (d.code) {
      const key = `errors.${d.code}`
      const translated = t(key)
      if (translated !== key) return translated
    }
    if (d.message) return d.message
  }
  if (typeof detail === "string" && detail) return detail
  return t(fallbackKey)
}
