// Single source of truth for new-file defaults (no hardcoded domain content elsewhere).
export const currentYear = () => new Date().getFullYear()

export const DEFAULT_TITULO = "Nueva revisión"

export const DEFAULT_PERSONAL_COUNT = 2

export const newArchivoPayload = () => ({
  titulo: DEFAULT_TITULO,
  tipo_revision: "",
  periodo_inicio: currentYear(),
  periodo_fin: currentYear(),
  personal_count: DEFAULT_PERSONAL_COUNT,
})

export const UNTITLED_EXPORT = "Revisión sin título"
