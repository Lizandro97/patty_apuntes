import { api } from "@/lib/api"

export const syncApi = {
  status: async () => (await api.get("/sync/status")).data,
}
