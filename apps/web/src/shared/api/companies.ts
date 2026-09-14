import { api } from "@/lib/api"

export const companiesApi = {
  list: async () => (await api.get("/companies")).data,
  create: async (name: string) => (await api.post("/companies", { name })).data,
  update: async (id: string, name: string) => (await api.put(`/companies/${id}`, { name })).data,
  remove: async (id: string) => api.delete(`/companies/${id}`),
}
