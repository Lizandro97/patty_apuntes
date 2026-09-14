import axios from "axios"

// Fase 0/4 LAN: en build se puede fijar VITE_API_URL (p. ej.
// http://foliora.local:8000/api); por defecto mismo origen /api.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("refresh_token")
  if (location.pathname !== "/login" && location.pathname !== "/register") {
    location.href = "/login"
  }
}

api.interceptors.response.use(
  (r) => r,
  async (e) => {
    const orig = e.config as { retried?: boolean; url?: string } | undefined
    if (
      e.response?.status === 401 &&
      orig &&
      !orig.retried &&
      !orig.url?.includes("/auth/")
    ) {
      // Fase 4: access corto (15 min) -> intenta refresh una vez antes de salir.
      orig.retried = true
      try {
        const rt = localStorage.getItem("refresh_token")
        if (!rt) throw new Error("no refresh")
        const r = await api.post("/auth/refresh", { refresh_token: rt })
        localStorage.setItem("token", r.data.access_token)
        localStorage.setItem("refresh_token", r.data.refresh_token)
        return api(orig as never)
      } catch {
        logout()
      }
    } else if (e.response?.status === 401) {
      logout()
    }
    return Promise.reject(e)
  },
)
