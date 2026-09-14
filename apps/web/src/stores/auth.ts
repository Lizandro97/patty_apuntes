import { create } from "zustand"

type AuthState = {
  token: string | null
  user: { id: string; email: string; full_name: string } | null
  setAuth: (token: string, user: any) => void
  logout: () => void
  init: () => void
}

function getInitial() {
  try {
    const t = localStorage.getItem("token")
    const u = localStorage.getItem("user")
    return {
      token: t,
      user: u ? JSON.parse(u) as AuthState["user"] : null,
    }
  } catch {
    return { token: null as string | null, user: null as AuthState["user"] }
  }
}

const initial = getInitial()

export const useAuthStore = create<AuthState>((set) => ({
  token: initial.token,
  user: initial.user,
  setAuth: (token, user) => {
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(user))
    set({ token, user })
  },
  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
    set({ token: null, user: null })
  },
  init: () => {
    const { token, user } = getInitial()
    if (token && user) set({ token, user })
  },
}))
