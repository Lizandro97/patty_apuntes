// Escala de anos (espejo de _ensure_cells/_sync_scale).

/** Ancho maximo permitido de rango (records.py: SCALE_TOO_WIDE). */
export const MAX_SCALE_YEARS = 20;

/** Anos incluidos en [start, end]. Vacio si el rango es invalido. */
export function rangeYears(start: number, end: number): number[] {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) return [];
  const out: number[] = [];
  for (let y = start; y <= end; y++) out.push(y);
  return out;
}
