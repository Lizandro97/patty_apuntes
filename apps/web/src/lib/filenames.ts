// Sanitized, collision-free export filenames: {title}-{yyyy-mm-dd}.{ext}
export function slugify(s: string): string {
  return (s || "archivo")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "archivo"
}

export function exportFilename(title: string, ext: "pdf" | "xlsx", lang?: string): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const base = slugify(title)
  void lang
  return `${base}-${ymd}.${ext}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Safari needs a tick before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
