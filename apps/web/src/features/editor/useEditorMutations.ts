/** Editor writes: the 9 mutations + mutErr.
 *
 *  Same optimistic updates, same invalidates, same mutErr.
 *  Page dependencies come in as parameters so the hook never
 *  couples to the page.
 */
import { useMutation, type QueryClient } from "@tanstack/react-query"
import { apiError } from "@/lib/errors"
import { queryKeys } from "@/shared/queryKeys"
import { PERSON_COLORS } from "./components"
import { editorApi } from "./api"
import { personName, sanitizeStaffNames } from "@foliora/validation"

export type PersistFn = <T>(fn: () => Promise<T>) => Promise<T | null>

export type EditorMutationsDeps = {
  recordId: string | undefined
  isDraft: boolean
  qc: QueryClient
  persist: PersistFn
  pushHistory: (label: string) => void
  setHeaderDirty: (v: boolean) => void
  draftApplyRow: (p: any) => void
  draftApplyRowPatch: (rowId: string, patch: any) => void
  draftDeleteRow: (rowId: string) => void
  draftApplyRecord: (patch: any) => void
  personIdx: number
  choosePerson: (i: number) => void
  staffNames: string[]
  activePerson: number
  scaleStart: number
  scaleEnd: number
  record: any
  push: (t: any) => void
  t: (k: string, o?: any) => string
}

export function useEditorMutations(d: EditorMutationsDeps) {
  const { recordId, isDraft, qc, persist, pushHistory, setHeaderDirty } = d
  // Save errors once silent (best-effort): now a toast with code.
  // The only signal when a tap doesn't persist (e.g. dead tunnel).
  const mutErr = (e: any) => {
    const detail = e?.response?.data?.detail
    const code = detail?.code ? ` (${detail.code})` : e?.response ? ` (${e.response.status})` : ""
    d.push({ kind: "error", title: `${apiError(d.t, detail ?? e?.message, "errors.fallback")}${code}` })
  }
  const toggle = useMutation({
    mutationFn: async (c: any) => {
      const myColor = PERSON_COLORS[d.activePerson] ?? ""
      return persist(async () => {
        if (!c.reviewed) return await editorApi.setCell(c.id, {reviewed: true, color: myColor })
        const owner = PERSON_COLORS.indexOf(c.color ?? "")
        if (owner !== d.activePerson) return await editorApi.setCell(c.id, {reviewed: true, color: myColor })
        return await editorApi.setCell(c.id, {reviewed: false, color: "" })
      })
    },
    onMutate: async (c: any) => {
      const myColor = PERSON_COLORS[d.activePerson] ?? ""
      const owner = PERSON_COLORS.indexOf(c?.color ?? "")
      const action = !c?.reviewed ? "mark" : (owner !== d.activePerson ? "recolor" : "unmark")
      const color = action === "unmark" ? "" : myColor
      pushHistory(action === "mark" ? d.t("editor.history.markAs", { who: personName(d.staffNames, d.activePerson) }) : action === "recolor" ? d.t("editor.history.recolor", { from: personName(d.staffNames, owner), to: personName(d.staffNames, d.activePerson) }) : d.t("editor.history.unmark"))
      setHeaderDirty(true)
      await qc.cancelQueries({ queryKey: queryKeys.cells(recordId) })
      const prev = qc.getQueryData(queryKeys.cells(recordId))
      qc.setQueryData(queryKeys.cells(recordId), (old: any) => (old ?? []).map((x: any) => x.id === c.id ? { ...x, reviewed: action !== "unmark", color } : x))
      return { prev }
    },
    onError: (e, _c, ctx: any) => { if (ctx?.prev) qc.setQueryData(queryKeys.cells(recordId), ctx.prev); mutErr(e) },
    onSettled: () => { qc.invalidateQueries({ queryKey: queryKeys.cells(recordId) }); qc.invalidateQueries({ queryKey: queryKeys.stats(recordId) }) },
  })
  // Recolor the selected cell from the panel (stamps when empty, never unstamps)
  const recolor = useMutation({
    mutationFn: async ({ cellId, color }: { cellId: string; color: string }) => persist(() => editorApi.setCell(cellId, {reviewed: true, color })),
    onMutate: async (v: { cellId: string; color: string }) => {
      await qc.cancelQueries({ queryKey: queryKeys.cells(recordId) })
      const prev = qc.getQueryData(queryKeys.cells(recordId))
      const cur = ((prev as any[]) ?? []).find((x: any) => x.id === v.cellId)
      const from = PERSON_COLORS.indexOf(cur?.color ?? "")
      const to = PERSON_COLORS.indexOf(v.color)
      pushHistory(cur?.reviewed ? d.t("editor.history.recolor", { from: from >= 0 ? personName(d.staffNames, from) : "", to: personName(d.staffNames, to) }) : d.t("editor.history.markAs", { who: personName(d.staffNames, to) }))
      setHeaderDirty(true)
      qc.setQueryData(queryKeys.cells(recordId), (old: any) => (old ?? []).map((x: any) => x.id === v.cellId ? { ...x, reviewed: true, color: v.color } : x))
      return { prev }
    },
    onError: (e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(queryKeys.cells(recordId), ctx.prev); mutErr(e) },
    onSettled: () => { qc.invalidateQueries({ queryKey: queryKeys.cells(recordId) }); qc.invalidateQueries({ queryKey: queryKeys.stats(recordId) }) },
  })
  const addRow = useMutation({ mutationFn: async (p:any) => persist(() => editorApi.addRow(recordId!, p)), onMutate: (p: any) => { pushHistory(d.t("editor.history.addRow")); setHeaderDirty(true); if (isDraft) d.draftApplyRow(p) }, onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rows(recordId) }); qc.invalidateQueries({ queryKey: queryKeys.cells(recordId) }) }, onError: mutErr })
  const updateRow = useMutation({ mutationFn: async ({ rowId, patch }: { rowId: string; patch: any }) => persist(() => editorApi.updateRow(recordId!, rowId, patch)), onMutate: (v: any) => { pushHistory(v?.patch?.company_id !== undefined ? d.t("editor.history.changeCompany") : d.t("editor.history.editRow")); setHeaderDirty(true); if (isDraft) d.draftApplyRowPatch(v.rowId, v.patch) }, onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rows(recordId) }); qc.invalidateQueries({ queryKey: queryKeys.cells(recordId) }) }, onError: mutErr })
  const deleteRow = useMutation({ mutationFn: async (rowId: string) => persist(() => editorApi.deleteRow(recordId!, rowId)), onMutate: (rowId: string) => { pushHistory(d.t("editor.history.deleteRow")); setHeaderDirty(true); if (isDraft) d.draftDeleteRow(rowId) }, onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rows(recordId) }); qc.invalidateQueries({ queryKey: queryKeys.design(recordId) }) }, onError: mutErr })
  const applyScale = useMutation({ mutationFn: async () => persist(() => editorApi.patchRecord(recordId!, {period_start: Number(d.scaleStart), period_end: Number(d.scaleEnd) })), onMutate: () => { pushHistory(d.t("editor.history.changeScale")); setHeaderDirty(true); if (isDraft) d.draftApplyRecord({ period_start: Number(d.scaleStart), period_end: Number(d.scaleEnd) }) }, onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.record(recordId) }); qc.invalidateQueries({ queryKey: queryKeys.rows(recordId) }); qc.invalidateQueries({ queryKey: queryKeys.cells(recordId) }); qc.invalidateQueries({ queryKey: queryKeys.stats(recordId) }) }, onError: mutErr })
  const updateStaff = useMutation({ mutationFn: async ({n, names}:{n:number;names?:string[]}) => persist(() => editorApi.patchRecord(recordId!, {staff_count: n, ...(names ? {staff_names: names} : {}) })), onMutate: ({n})=>{ pushHistory(d.t("editor.history.changeStaff")); setHeaderDirty(true); if (isDraft) d.draftApplyRecord({ staff_count: n }) }, onSuccess: (_d2, {n}) => { qc.invalidateQueries({queryKey: queryKeys.record(recordId)}); if (d.personIdx >= n) { d.choosePerson(Math.max(0, n - 1)); d.push({ kind: "info", title: d.t("editor.panel.staffShrunk", { who: personName(d.staffNames, Math.max(0, n - 1)) }) }) } }, onError: mutErr })
  const updateNames = useMutation({ mutationFn: async (names:string[]) => { const clean = sanitizeStaffNames(names); if (isDraft) { d.draftApplyRecord({ staff_names: clean }); return clean } return persist(() => editorApi.patchRecord(recordId!, {staff_names: clean})) }, onMutate: ()=>{ pushHistory(d.t("editor.history.changeNames")); setHeaderDirty(true) }, onSuccess: () => { qc.invalidateQueries({queryKey: queryKeys.record(recordId)}) }, onError: mutErr })
  const saveType = (v:string) => { const txt = v.trim(); if (txt !== (d.record?.review_type ?? "")) { pushHistory(d.t("editor.history.changeType")); setHeaderDirty(true); if (isDraft) d.draftApplyRecord({ review_type: txt }); else persist(() => editorApi.patchRecord(recordId!,{review_type:txt}).then(()=>qc.invalidateQueries({queryKey: queryKeys.record(recordId)}))) } }

  return { mutErr, toggle, recolor, addRow, updateRow, deleteRow, applyScale, updateStaff, updateNames, saveType }
}
