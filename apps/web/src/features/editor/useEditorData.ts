/** Editor reads: the 6 useQuery hooks + initial snapshot.
 *
 *  Same keys, same enabled flags, same draft stats computation,
 *  same savedRef effect.
 */
import { useEffect, type MutableRefObject } from "react"
import { useQuery, type QueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/shared/queryKeys"
import type { HistorySnapshot } from "@/stores/history"
import { editorApi } from "./api"

export function useEditorData(
  recordId: string | undefined,
  isDraft: boolean,
  qc: QueryClient,
  savedRef: MutableRefObject<HistorySnapshot | null>,
) {
  const { data: record, isPending: recPending, isError: recError, refetch: recRefetch } = useQuery({ queryKey: queryKeys.record(recordId), enabled: !!recordId, queryFn: () => editorApi.getRecord(recordId!) })
  const { data: rows, isPending: rowsPending, isError: rowsError, refetch: rowsRefetch } = useQuery({ queryKey: queryKeys.rows(recordId), enabled: !!recordId, queryFn: () => editorApi.getRows(recordId!) })
  const { data: cells, isError: cellsError, refetch: cellsRefetch } = useQuery({ queryKey: queryKeys.cells(recordId), enabled: !!recordId, queryFn: () => editorApi.getCells(recordId!) })
  const { data: statsData } = useQuery({ queryKey: queryKeys.stats(recordId), enabled: !!recordId, queryFn: () => editorApi.getStats(recordId!) })
  // Draft: compute progress locally so the summary block works before Guardar
  const stats = isDraft
    ? (() => {
        const list = ((cells as any[]) ?? [])
        const total = list.length
        const reviewed = list.filter((c: any) => c.reviewed).length
        return total ? { total, reviewed, pending: total - reviewed, progress: Math.round((reviewed / total) * 100) } : null
      })()
    : statsData
  const { data: companies, isError: companiesError, refetch: companiesRefetch } = useQuery({ queryKey: queryKeys.companies, queryFn: editorApi.getCompanies })
  const { data: design } = useQuery({ queryKey: queryKeys.design(recordId), enabled: !!recordId, queryFn: () => editorApi.getDesign(recordId!) })
  useEffect(() => {
    if (!isDraft && record && rows && cells && !savedRef.current) {
      savedRef.current = {
        label: "saved",
        rows: qc.getQueryData(queryKeys.rows(recordId)),
        cells: qc.getQueryData(queryKeys.cells(recordId)),
        record: qc.getQueryData(queryKeys.record(recordId)),
      }
    }
  }, [isDraft, record, rows, cells])

  return {
    record, rows, cells, statsData, stats, companies, design,
    recPending, rowsPending, recError, rowsError, cellsError, companiesError,
    recRefetch, rowsRefetch, cellsRefetch, companiesRefetch,
  }
}
