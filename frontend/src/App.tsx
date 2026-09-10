import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "./components/Layout"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { Inicio } from "./pages/Inicio"
import { Empresas } from "./pages/Empresas"
import { Archivos } from "./pages/Archivos"
import { Editor } from "./pages/Editor"
import { Configuracion } from "./pages/Configuracion"
import { useAuthStore } from "./stores/auth"
import { useEffect } from "react"
import { useConfigStore } from "./stores/config"

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const init = useAuthStore(s=>s.init)
  const apply = useConfigStore(s=>s.applyCss)
  useEffect(()=>{ init(); apply() },[])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<Inicio />} />
          <Route path="empresas" element={<Empresas />} />
          <Route path="archivos" element={<Archivos />} />
          <Route path="editor" element={<Editor />} />
          <Route path="editor/:id" element={<Editor />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
