import axios from "axios"
import { useAuthStore } from "@/stores/auth"

/** SPA event to expire the session without a hard reload (App listens). */
export const AUTH_LOGOUT_EVENT = "auth:logout"

// LAN: in build you can pin VITE_API_URL (e.g.
// http://foliora.local:8000/api); same-origin /api by default.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function logout() {
  useAuthStore.getState().logout()
  if (location.pathname !== "/login" && location.pathname !== "/register") {
    // SPA navigation via App (no hard reload that would lose state).
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT))
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
      // Short-lived access (15 min) -> try refresh once before signing out.
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
