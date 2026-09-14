import { api } from "@/lib/api"

export type User = { id: string; email: string; full_name: string }
export type Credentials = { email: string; password: string }
export type Session = { access_token: string; refresh_token: string; user: User }

async function fetchMe(access_token: string): Promise<User> {
  return (
    await api.get("/auth/me", { headers: { Authorization: `Bearer ${access_token}` } })
  ).data
}

export const authApi = {
  async login(credentials: Credentials): Promise<Session> {
    const { data } = await api.post("/auth/login", credentials)
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: await fetchMe(data.access_token),
    }
  },
  async register(data: Credentials & { full_name: string }): Promise<Session> {
    await api.post("/auth/register", data)
    return this.login({ email: data.email, password: data.password })
  },
  async me(): Promise<User> {
    return (await api.get("/auth/me")).data
  },
}
