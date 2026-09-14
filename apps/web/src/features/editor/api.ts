/** Editor data layer: every HTTP call of the Editor.
 *
 *  Same URL, same body, same response. The page only changes the call-site.
 */
import { api } from "@/lib/api"

export type CellBody = {
  reviewed?: boolean
  color?: string
  assignee?: string
  note?: string
  style?: Record<string, unknown>
}

export const editorApi = {
  // ---- reads ----
  getRecord: async (id: string) => (await api.get(`/records/${id}`)).data,
  getRows: async (id: string) => (await api.get(`/records/${id}/rows`)).data,
  getCells: async (id: string) => (await api.get(`/records/${id}/cells`)).data,
  getStats: async (id: string) => (await api.get(`/records/${id}/stats`)).data,
  getCompanies: async () => (await api.get("/companies")).data,
  getDesign: async (id: string) => (await api.get(`/records/${id}/layout`)).data,

  // ---- cells ----
  setCell: async (cellId: string, body: CellBody) =>
    (await api.put(`/records/cells/${cellId}`, body)).data,
  bulkCells: async (
    recordId: string,
    body: { ids: string[]; reviewed: boolean; color: string },
  ) => (await api.post(`/records/${recordId}/cells/bulk`, body)).data,

  // ---- rows ----
  addRow: async (recordId: string, payload: Record<string, unknown>) =>
    (await api.post(`/records/${recordId}/rows`, payload)).data,
  updateRow: async (recordId: string, rowId: string, patch: Record<string, unknown>) =>
    (await api.put(`/records/${recordId}/rows/${rowId}`, patch)).data,
  deleteRow: async (recordId: string, rowId: string) =>
    api.delete(`/records/${recordId}/rows/${rowId}`),
  reorderRows: async (recordId: string, ids: string[]) =>
    api.post(`/records/${recordId}/rows/reorder`, { ids }),

  // ---- record ----
  patchRecord: async (recordId: string, patch: Record<string, unknown>) =>
    (await api.put(`/records/${recordId}`, patch)).data,
  createRecord: async (payload: Record<string, unknown>) =>
    (await api.post("/records", payload)).data,

  // ---- layout ----
  putLayout: async (recordId: string, section: string, payload: Record<string, unknown>) =>
    api.put(`/records/${recordId}/layout`, { section, payload }),

  // ---- export ----
  exportBlob: async (recordId: string, fmt: "pdf" | "excel", lang: string) =>
    (
      await api.get(`/records/${recordId}/export?format=${fmt}&lang=${lang}`, {
        responseType: "blob",
      })
    ).data,
}
