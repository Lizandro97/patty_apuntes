import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import { Layout } from "./components/Layout"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { Inicio } from "./pages/Inicio"
import { Companies } from "./pages/Companies"
import { Records } from "./pages/Records"
import { Editor } from "./pages/Editor"
import { Settings } from "./pages/Settings"
import { useAuthStore } from "./stores/auth"
import { useEffect } from "react"
import { useSettingsStore } from "./stores/settings"
import { AUTH_LOGOUT_EVENT } from "./lib/api"
import { settingsApi } from "./shared/api/settings"
import { applyLanguage } from "./i18n"

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

/** Puente SPA: el interceptor 401 emite el evento, aqui navegamos sin reload. */
function AuthEvents() {
  const nav = useNavigate()
  useEffect(() => {
    const h = () => nav("/login", { replace: true })
    window.addEventListener(AUTH_LOGOUT_EVENT, h)
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, h)
  }, [nav])
  return null
}

export default function App() {
  const init = useAuthStore(s=>s.init)
  const apply = useSettingsStore(s=>s.applyCss)
  useEffect(()=>{
    init()
    apply()
    if (useAuthStore.getState().token) {
      settingsApi.get().then(r => {
        const lng = r?.language
        if (lng === "es" || lng === "en") applyLanguage(lng)
      }).catch(()=>{})
    }
  },[])

  return (
    <BrowserRouter>
      <AuthEvents />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<Inicio />} />
          <Route path="companies" element={<Companies />} />
          <Route path="records" element={<Records />} />
          <Route path="editor" element={<Editor />} />
          <Route path="editor/:id" element={<Editor />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
