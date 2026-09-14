/** Draft + local→server reconciliation.
 *
 *  Same cache semantics and diff. Pure functions over QueryClient;
 *  the page provides qc, recordId, companies, t and language as parameters.
 */
import type { QueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/shared/queryKeys"
import type { HistorySnapshot } from "@/stores/history"
import { sanitizeStaffNames } from "@foliora/validation"
import { editorApi } from "./api"

export function companyNameOf(companies: any, companyId?: string): string {
  return ((companies as any[]) ?? []).find((e: any) => e.id === companyId)?.name ?? ""
}

export function snapshotCurrent(
  qc: QueryClient,
  recordId: string | undefined,
  label: string,
): HistorySnapshot {
  return {
    label,
    rows: qc.getQueryData(queryKeys.rows(recordId)),
    cells: qc.getQueryData(queryKeys.cells(recordId)),
    record: qc.getQueryData(queryKeys.record(recordId)),
  }
}

export function applySnapshot(
  qc: QueryClient,
  recordId: string | undefined,
  s: HistorySnapshot,
) {
  if (s.rows !== undefined) qc.setQueryData(queryKeys.rows(recordId), s.rows)
  if (s.cells !== undefined) qc.setQueryData(queryKeys.cells(recordId), s.cells)
  if (s.record !== undefined) qc.setQueryData(queryKeys.record(recordId), s.record)
}

// Draft: apply row/record operations to local cache (mirrors server semantics)
export function draftApplyRow(
  qc: QueryClient,
  recordId: string | undefined,
  companies: any,
  p: any,
) {
  const rowsNow = ((qc.getQueryData(queryKeys.rows(recordId)) as any[]) ?? []).slice()
  const name = p.company_id ? companyNameOf(companies, p.company_id) : (p.name ?? "").trim()
  const row = { id: `dr-${Date.now().toString(36)}-${rowsNow.length}`, record_id: "draft", company_id: p.company_id ?? null, name_snapshot: name, position: rowsNow.length, assignee: "", note: "" }
  qc.setQueryData(queryKeys.rows(recordId), [...rowsNow, row])
}

export function draftApplyRowPatch(
  qc: QueryClient,
  recordId: string | undefined,
  companies: any,
  rowId: string,
  patch: any,
) {
  qc.setQueryData(queryKeys.rows(recordId), (old: any) => (old ?? []).map((f: any) => {
    if (f.id !== rowId) return f
    const next = { ...f }
    if (patch.company_id !== undefined) {
      next.company_id = patch.company_id || null
      if (patch.company_id) next.name_snapshot = companyNameOf(companies, patch.company_id)
      else if (patch.name !== undefined) next.name_snapshot = patch.name
    } else if (patch.name !== undefined) next.name_snapshot = patch.name
    if (patch.assignee !== undefined) next.assignee = patch.assignee
    if (patch.note !== undefined) next.note = patch.note
    return next
  }))
}

export function draftDeleteRow(
  qc: QueryClient,
  recordId: string | undefined,
  rowId: string,
) {
  qc.setQueryData(queryKeys.rows(recordId), (old: any) => (old ?? []).filter((f: any) => f.id !== rowId))
  qc.setQueryData(queryKeys.cells(recordId), (old: any) => (old ?? []).filter((c: any) => c.row_id !== rowId))
}

export function draftApplyRecord(
  qc: QueryClient,
  recordId: string | undefined,
  patch: any,
) {
  qc.setQueryData(queryKeys.record(recordId), (old: any) => ({ ...old, ...patch }))
}

// Brings the server to the `target` state, using `source` (previous local state) for a minimal diff.
export async function syncSnapshotToServer(
  recordId: string | undefined,
  target: HistorySnapshot,
  source: HistorySnapshot,
  opts: {
    force?: boolean
    localOnly: boolean
    t: (k: string, o?: any) => string
    lang: string
  },
) {
  const { force = false, localOnly, t, lang } = opts
  if (localOnly && !force) return // undo/redo stays local until Save
  const tFilas: any[] = target.rows ?? []
  const sFilas: any[] = source.rows ?? []
  const tCeldas: any[] = target.cells ?? []
  const sCeldas: any[] = source.cells ?? []
  // Record
  const ta = target.record as any, sa = source.record as any
  if (ta && sa) {
    const patch: any = {}
    for (const k of ["title", "review_type", "period_start", "period_end", "staff_count"]) {
      if (ta[k] !== sa[k] && ta[k] !== undefined) patch[k] = ta[k]
    }
    // Arrays by value (reference always differs): team names.
    if (JSON.stringify(ta.staff_names ?? []) !== JSON.stringify(sa.staff_names ?? [])) {
      patch.staff_names = sanitizeStaffNames(ta.staff_names)
    }
    if (Object.keys(patch).length) {
      try { await editorApi.patchRecord(recordId!, patch) } catch { /* best-effort */ }
    }
  } else if (ta && !sa) {
    const patch: any = {}
    for (const k of ["title", "review_type", "period_start", "period_end", "staff_count"]) {
      if (ta[k] !== undefined) patch[k] = ta[k]
    }
    if (ta.staff_names !== undefined) patch.staff_names = sanitizeStaffNames(ta.staff_names)
    if (Object.keys(patch).length) {
      try { await editorApi.patchRecord(recordId!, patch) } catch { /* best-effort */ }
    }
  }
  // Deleted rows in target (leftover on server) -> DELETE
  const tIds = new Set(tFilas.map((f: any) => f.id))
  const sIds = new Set(sFilas.map((f: any) => f.id))
  const recreatedOldIds = new Set<string>()
  for (const f of sFilas) {
    if (!tIds.has(f.id)) {
      try { await editorApi.deleteRow(recordId!, f.id) } catch { /* best-effort */ }
    }
  }
  // Rows missing on the server (were deleted) -> recreate
  for (const f of tFilas) {
    if (!sIds.has(f.id)) {
      recreatedOldIds.add(f.id)
      try {
        const payload: any = f.company_id ? {company_id: f.company_id } : {name: f.name_snapshot || t("editor.table.defaultRowName", { n: "" }).trim() || (lang === "en" ? "Row" : "Fila") }
        const created = await editorApi.addRow(recordId!, payload)
        const patch: any = {}
        if (f.assignee) patch.assignee = f.assignee
        if (f.note) patch.note = f.note
        if (Object.keys(patch).length) await editorApi.updateRow(recordId!, created.id, patch)
        // Restore checks on that row (recreated ones are born unchecked)
        const want = tCeldas.filter((c: any) => c.row_id === f.id && c.reviewed)
        if (want.length) {
          const fresh = (await editorApi.getCells(recordId!)) as any[]
          const byKey = new Map(fresh.filter((c: any) => c.row_id === created.id).map((c: any) => [`${c.year}-${c.month}`, c]))
          await Promise.all(want.map((w: any) => {
            const hit = byKey.get(`${w.year}-${w.month}`)
            return hit ? editorApi.setCell(hit.id, {reviewed: true, color: w.color ?? "" }).catch(() => null) : null
          }))
        }
      } catch { /* best-effort */ }
    }
  }
  // Common rows with changes -> PUT
  await Promise.all(tFilas.filter((f: any) => sIds.has(f.id)).map(async (f: any) => {
    const s = sFilas.find((x: any) => x.id === f.id)
    if (!s) return null
    const patch: any = {}
    if (f.company_id !== s.company_id) patch.company_id = f.company_id ?? ""
    if ((f.name_snapshot ?? "") !== (s.name_snapshot ?? "") && !f.company_id) patch.name = f.name_snapshot
    if ((f.assignee ?? "") !== (s.assignee ?? "")) patch.assignee = f.assignee ?? ""
    if ((f.note ?? "") !== (s.note ?? "")) patch.note = f.note ?? ""
    if (Object.keys(patch).length) {
      try { await editorApi.updateRow(recordId!, f.id, patch) } catch { /* best-effort */ }
    }
    return null
  }))
  // Order -> reorder if the sequence changed
  const tOrder = tFilas.slice().sort((a: any, b: any) => a.position - b.position).map((f: any) => f.id).join(",")
  const sOrder = sFilas.slice().sort((a: any, b: any) => a.position - b.position).map((f: any) => f.id).join(",")
  if (tOrder && tOrder !== sOrder) {
    try { await editorApi.reorderRows(recordId!, tFilas.slice().sort((a: any, b: any) => a.position - b.position).map((f: any) => f.id)) } catch { /* best-effort */ }
  }
  // Common cells (same id) with different reviewed flag or color -> PUT
  const sById = new Map(sCeldas.map((c: any) => [c.id, c]))
  const changed = tCeldas.filter((c: any) => {
    if (recreatedOldIds.has(c.row_id)) return false
    const s = sById.get(c.id)
    return s && (!!s.reviewed !== !!c.reviewed || (s.color ?? "") !== (c.color ?? ""))
  })
  if (changed.length) {
    await Promise.all(changed.map((c: any) =>
      editorApi.setCell(c.id, {reviewed: !!c.reviewed, color: c.color ?? "" }).catch(() => null)
    ))
  }
}
