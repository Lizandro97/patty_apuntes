// Logica de negocio pura (espejo de app/services/records_service:calc_progress).
// Contrato: Math.round half-up en ambos lados (Python: int(x + 0.5)).

/** Progreso 0-100 de celdas revisadas sobre total. */
export function calcProgress(reviewed: number, total: number): number {
  if (!total) return 0;
  return Math.round((reviewed * 100) / total);
}
