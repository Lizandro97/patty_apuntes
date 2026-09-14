/** Factoria central de queryKeys (Fase B).
 *
 *  Los valores son identicos a los literales historicos: cambiar aqui
 *  NO invalida la cache existente. Importar desde aqui en vez de
 *  escribir ["records"], ["cells", id], etc. a mano.
 */
export const queryKeys = {
  records: ["records"],
  companies: ["companies"],
  syncStatus: ["sync-status"],
  record: (id: string | undefined) => ["record", id],
  rows: (id: string | undefined) => ["rows", id],
  cells: (id: string | undefined) => ["cells", id],
  stats: (id: string | undefined) => ["stats", id],
  design: (id: string | undefined) => ["design", id],
} as const
