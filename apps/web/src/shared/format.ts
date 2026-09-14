/** Single date formatter (was triplicated across Inicio/Records/Companies). */
export function fmtDate(v: string | number | Date | null | undefined, lang: string): string {
  if (!v) return "—"
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(lang.startsWith("es") ? "es-PE" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}
