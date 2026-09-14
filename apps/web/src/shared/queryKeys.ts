/** Central queryKey factory (Fase B).
 *
 *  Values are identical to the historic literals: changing them here
 *  does NOT invalidate the existing cache. Import from here instead of
 *  hand-writing ["records"], ["cells", id], etc.
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
