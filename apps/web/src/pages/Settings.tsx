import { useSettingsStore } from "@/stores/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { settingsApi } from "@/shared/api/settings"
import { useToast } from "@/lib/toast"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { applyLanguage, type AppLang } from "@/i18n"

const SWATCHES = ["#EC4899", "#0ea5e9", "#8b5cf6", "#f97316", "#eab308", "#10b981", "#0E7C5B"]

export function Settings() {
  const { t } = useTranslation()
  const { push } = useToast()
  const settings = useSettingsStore()
  const [lang, setLang] = useState<AppLang>("es")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setLoading(true)
    settingsApi.get().then(r => {
      // Solo claves del store: el DTO trae id/user_id/updated_at/language
      // que no pertenecen al estado local (antes se volcaba todo).
      const { primary_color, font_family, font_size_px, table_density, grid_columns,
        show_summary, rounded_borders, pastel_mode, visible_fields, table_header_bg } = r ?? {}
      settings.set({
        primary_color, font_family, font_size_px, table_density, grid_columns,
        show_summary, rounded_borders, pastel_mode, visible_fields, table_header_bg,
      })
      if (r?.language === "es" || r?.language === "en") setLang(r.language)
      setLoadError(false)
    }).catch(() => setLoadError(true)).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markDirty = (fn: () => void) => { fn(); setDirty(true) }

  const serverPayload = () => ({
    primary_color: settings.primary_color,
    font_family: settings.font_family,
    font_size_px: settings.font_size_px,
    table_density: settings.table_density,
    grid_columns: settings.grid_columns,
    show_summary: settings.show_summary,
    rounded_borders: settings.rounded_borders,
    pastel_mode: settings.pastel_mode,
    visible_fields: settings.visible_fields,
    table_header_bg: settings.table_header_bg,
    language: lang,
  })

  const save = async () => {
    setSaving(true)
    try {
      await settingsApi.save(serverPayload())
      applyLanguage(lang)
      setDirty(false)
      push({ kind: "success", title: t("settings.saved") })
    } catch {
      push({ kind: "error", title: t("settings.saveError"), actionLabel: t("common.retry"), onAction: () => save() })
    } finally {
      setSaving(false)
    }
  }

  const resetAll = async () => {
    settings.reset()
    setLang("es")
    try {
      await settingsApi.save({
        primary_color: "", font_family: "Inter", font_size_px: 14,
        table_density: "normal", grid_columns: 3, show_summary: true,
        rounded_borders: true, pastel_mode: true,
        visible_fields: { names: true, assignee: true, date: true, notes: true },
        table_header_bg: "",
        language: "es",
      })
      applyLanguage("es")
      setDirty(false)
      push({ kind: "success", title: t("settings.saved") })
    } catch {
      push({ kind: "error", title: t("settings.saveError") })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 bg-[var(--bg)] p-6 overflow-auto">
        <div className="max-w-[800px] mx-auto space-y-4" aria-hidden>
          <div className="h-8 w-48 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          <div className="h-64 rounded-xl bg-[var(--surface-2)] animate-pulse" />
          <span className="sr-only">{t("common.loading")}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[800px] mx-auto space-y-4">
        <h1 className="text-[22px] font-bold text-[var(--text)]">{t("settings.title")}</h1>
        <p className="text-sm text-[var(--text-dim)]">{t("settings.subtitle")}</p>
        {loadError && <p role="alert" className="text-sm text-[var(--danger)]">{t("common.loadError")}</p>}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-6">
          <div>
            <h3 id="sw-label" className="font-medium text-[var(--text)] mb-3">{t("settings.primaryColor")}</h3>
            <div className="flex gap-2 items-center flex-wrap" role="group" aria-labelledby="sw-label">
              {SWATCHES.map(c => (
                <button key={c} title={c} aria-label={t("settings.colorName", { hex: c })} aria-pressed={settings.primary_color.toLowerCase() === c.toLowerCase()} onClick={() => markDirty(() => settings.set({ primary_color: c }))} className="w-11 h-11 rounded-full border-2 grid place-items-center" style={{ background: c, borderColor: settings.primary_color.toLowerCase() === c.toLowerCase() ? "var(--accent)" : "var(--border)" }}>
                  {settings.primary_color.toLowerCase() === c.toLowerCase() && <span aria-hidden className="text-white text-sm font-bold">✓</span>}
                </button>
              ))}
              <span className="relative inline-flex w-11 h-11 rounded-full border-2 overflow-hidden" style={{ borderColor: "var(--border)" }} title={t("settings.primaryColor")}>
                <span aria-hidden className="absolute inset-0 grid place-items-center text-lg text-[var(--text-dim)]">+</span>
                <Input type="color" aria-label={t("settings.primaryColor")} value={/^#[0-9a-f]{6}$/i.test(settings.primary_color) ? settings.primary_color : "#EC4899"} onChange={e => markDirty(() => settings.set({ primary_color: e.target.value }))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </span>
              <span className="text-xs text-[var(--text-dim)]" aria-live="polite">{settings.primary_color || t("editor.panel.auto")}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="set-font" className="text-xs text-[var(--text-dim)]">{t("settings.font")}</label>
              <select id="set-font" value={settings.font_family} onChange={e => markDirty(() => settings.set({ font_family: e.target.value }))} className="w-full min-h-[44px] bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 mt-1 text-sm text-[var(--text)]">
                <option>Inter</option><option>Geist</option><option value="system-ui">System</option>
              </select>
            </div>
            <div>
              <label htmlFor="set-size" className="text-xs text-[var(--text-dim)]">{t("settings.size")}</label>
              <select id="set-size" value={settings.font_size_px} onChange={e => markDirty(() => settings.set({ font_size_px: Number(e.target.value) }))} className="w-full min-h-[44px] bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 mt-1 text-sm text-[var(--text)]">
                <option value={12}>{t("settings.px", { n: 12 })}</option><option value={14}>{t("settings.px", { n: 14 })}</option><option value={16}>{t("settings.px", { n: 16 })}</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="set-lang" className="text-xs text-[var(--text-dim)]">{t("settings.language")}</label>
            <select id="set-lang" value={lang} onChange={e => { setLang(e.target.value as AppLang); setDirty(true) }} className="w-full min-h-[44px] bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 mt-1 text-sm text-[var(--text)]">
              <option value="es">{t("settings.spanish")}</option>
              <option value="en">{t("settings.english")}</option>
            </select>
          </div>
          <p className="text-xs text-[var(--text-dim)]">{t("settings.tableNote")}</p>
          <div className="border-t border-[var(--border)] pt-4">
            <div className="flex items-center justify-between gap-3 min-h-[44px]">
              <div>
                <div className="text-sm font-medium text-[var(--text)]">{t("settings.autosave")}</div>
                <div className="text-xs text-[var(--text-dim)]">{t("settings.autosaveHint")}</div>
              </div>
              <button
                role="switch"
                aria-checked={settings.autosave !== false}
                aria-label={t("settings.autosave")}
                onClick={() => markDirty(() => settings.set({ autosave: !(settings.autosave !== false) }))}
                className={`relative w-[52px] h-8 shrink-0 rounded-full border transition ${settings.autosave !== false ? "bg-[var(--accent)] border-[var(--accent)]" : "bg-[var(--surface-2)] border-[var(--border)]"}`}
              >
                <span aria-hidden className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow transition-all ${settings.autosave !== false ? "left-[24px]" : "left-[3px]"}`} />
              </button>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button onClick={save} disabled={saving || !dirty} className="min-h-[44px] rounded-lg">{saving ? t("common.loading") : t("settings.saveToServer")}</Button>
            <Button variant="outline" onClick={resetAll} className="min-h-[44px] rounded-lg">{t("settings.reset")}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
