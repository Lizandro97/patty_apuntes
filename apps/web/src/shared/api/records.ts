import { api } from "@/lib/api"

export const recordsApi = {
  list: async () => (await api.get("/records")).data,
  create: async (payload: Record<string, unknown>) => (await api.post("/records", payload)).data,
  rename: async (id: string, title: string) => (await api.put(`/records/${id}`, { title })).data,
  remove: async (id: string) => api.delete(`/records/${id}`),
  exportBlob: async (id: string, fmt: "pdf" | "excel", lang: string) =>
    (await api.get(`/records/${id}/export?format=${fmt}&lang=${lang}`, { responseType: "blob" }))
      .data,
}
