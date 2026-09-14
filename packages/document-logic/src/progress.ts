// Logica de negocio pura (espejo de routers/records.py:_recalc_progress).

/** Progreso 0-100 de celdas revisadas sobre total. */
export function calcProgress(reviewed: number, total: number): number {
  if (!total) return 0;
  return Math.round((reviewed * 100) / total);
}
