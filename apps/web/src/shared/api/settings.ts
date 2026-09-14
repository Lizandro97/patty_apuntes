import { api } from "@/lib/api"

export const settingsApi = {
  get: async () => (await api.get("/settings")).data,
  save: async (payload: Record<string, unknown>) => (await api.put("/settings", payload)).data,
}
