import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
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
import { api } from "./lib/api"
import { applyLanguage } from "./i18n"

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const init = useAuthStore(s=>s.init)
  const apply = useSettingsStore(s=>s.applyCss)
  useEffect(()=>{
    init()
    apply()
    if (useAuthStore.getState().token) {
      api.get("/settings").then(r => {
        const lng = r.data?.language
        if (lng === "es" || lng === "en") applyLanguage(lng)
      }).catch(()=>{})
    }
  },[])

  return (
    <BrowserRouter>
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
