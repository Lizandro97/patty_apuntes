import { useSettingsStore } from "@/stores/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { applyLanguage, type AppLang } from "@/i18n"

export function Settings() {
  const { t } = useTranslation()
  const settings = useSettingsStore()
  const [saved,setSaved]=useState(false)
  const [lang,setLang]=useState<AppLang>("es")
  useEffect(()=>{
    api.get("/settings").then(r=> {
      settings.set(r.data)
      if (r.data?.language === "es" || r.data?.language === "en") setLang(r.data.language)
    }).catch(()=>{})
  },[])
  const save = async()=>{
    await api.put("/settings", {
      primary_color: settings.primary_color,
      font_family: settings.font_family,
      font_size_px: settings.font_size_px,
      table_density: settings.table_density,
      grid_columns: settings.grid_columns,
      show_summary: settings.show_summary,
      rounded_borders: settings.rounded_borders,
      pastel_mode: settings.pastel_mode,
      visible_fields: settings.visible_fields,
      language: lang,
    }).catch(()=>{})
    applyLanguage(lang)
    setSaved(true); setTimeout(()=>setSaved(false),2000)
  }
  return (
    <div className="flex-1 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[800px] mx-auto space-y-4">
        <h1 className="text-[22px] font-bold text-[var(--text)]">{t("settings.title")}</h1>
        <p className="text-sm text-[var(--text-dim)]">{t("settings.subtitle")}</p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-6">
          <div>
            <h3 className="font-medium text-[var(--text)] mb-3">{t("settings.primaryColor")}</h3>
            <div className="flex gap-2 items-center">
              {["#EC4899","#0ea5e9","#8b5cf6","#ec4899","#f97316","#eab308","#10b981"].map(c=> (
                <button key={c} title={c} aria-label={t("settings.colorName", { hex: c })} aria-pressed={settings.primary_color===c} onClick={()=>settings.set({primary_color:c})} className="w-8 h-8 rounded-full border-2" style={{background:c, borderColor: settings.primary_color===c?"white":"var(--border)"}} />
              ))}
              <Input type="color" aria-label={t("settings.primaryColor")} value={settings.primary_color} onChange={e=>settings.set({primary_color:e.target.value})} className="w-12 h-8 p-1 bg-[var(--bg)] border-[var(--border)]" />
              <span className="text-xs text-[var(--text-dim)]">{settings.primary_color}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-[var(--text-dim)]">{t("settings.font")}</label><select aria-label={t("settings.font")} value={settings.font_family} onChange={e=>settings.set({font_family:e.target.value})} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 mt-1 text-sm text-[var(--text)]"><option>Inter</option><option>Geist</option></select></div>
            <div><label className="text-xs text-[var(--text-dim)]">{t("settings.size")}</label><select aria-label={t("settings.size")} value={settings.font_size_px} onChange={e=>settings.set({font_size_px: Number(e.target.value)})} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 mt-1 text-sm text-[var(--text)]"><option value={12}>{t("settings.px", { n: 12 })}</option><option value={14}>{t("settings.px", { n: 14 })}</option></select></div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)]">{t("settings.language")}</label>
            <select aria-label={t("settings.language")} value={lang} onChange={e=>setLang(e.target.value as AppLang)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 mt-1 text-sm text-[var(--text)]">
              <option value="es">{t("settings.spanish")}</option>
              <option value="en">{t("settings.english")}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg">{t("settings.saveToServer")}</Button>
            <Button variant="outline" onClick={()=>settings.reset()} className="bg-[var(--bg)] border-[var(--border)] text-[var(--text-dim)] rounded-lg">{t("settings.reset")}</Button>
            {saved && <span className="text-sm text-[var(--success)] self-center">{t("settings.saved")}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
