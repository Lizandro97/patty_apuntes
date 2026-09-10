import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import { Home, FileText, Building2, Files, Settings, LogOut, Sun, Eye, Undo2, Redo2, Download } from "lucide-react"
import { useAuthStore } from "@/stores/auth"
import { useEditorHeaderStore } from "@/stores/editorHeader"
import { useState } from "react"
import { cn } from "@/lib/utils"

const items = [
  { to: "/", key: "inicio", label: "Inicio", icon: Home },
  { to: "/editor", key: "editor", label: "Editor", icon: FileText },
  { to: "/empresas", key: "empresas", label: "Empresas", icon: Building2 },
  { to: "/archivos", key: "archivos", label: "Archivos", icon: Files },
  { to: "/configuracion", key: "config", label: "Config", icon: Settings },
] as const

function Rail() {
  const loc = useLocation()
  const activeKey = loc.pathname === "/" ? "inicio" : loc.pathname.startsWith("/editor") ? "editor" : loc.pathname.startsWith("/empresas") ? "empresas" : loc.pathname.startsWith("/archivos") ? "archivos" : "config"
  return (
    <nav className="w-[68px] bg-[#0f1117] border-r border-[#1e2230] flex flex-col items-center py-2 gap-0.5 shrink-0 no-print">
      {items.map((it) => {
        const Icon = it.icon
        const isActive = activeKey === it.key
        return (
          <NavLink
            key={it.key}
            to={it.to}
            className={cn(
              "w-[56px] flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] leading-none transition border",
              isActive ? "bg-[#1e1a2e] text-[#EC4899] border-[#EC4899]/25" : "text-[#6b7280] border-transparent hover:text-[#c8ccdb] hover:bg-[#1a1d27]"
            )}
          >
            <Icon className={cn("w-[18px] h-[18px]", isActive && "stroke-[#EC4899]")} strokeWidth={isActive ? 2 : 1.7} />
            <span className="text-[10px] leading-none">{it.label}</span>
          </NavLink>
        )
      })}
      <div className="flex-1" />
      <div className="w-[56px] flex flex-col items-center gap-2 py-3 border-t border-[#1e2230] mt-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EC4899] to-[#8b5cf6] grid place-items-center text-white text-xs font-bold">
          {(useAuthStore.getState().user?.full_name?.[0] ?? "P").toUpperCase()}
        </div>
      </div>
    </nav>
  )
}

function Topbar() {
  const loc = useLocation()
  const isEditor = loc.pathname.startsWith("/editor")
  const hdr = useEditorHeaderStore()
  const { user, logout } = useAuthStore()
  const nav = useNavigate()
  const [preview, setPreview] = useState(false)

  return (
    <header className="h-[52px] flex items-center justify-between px-3 bg-[#0f1117] border-b border-[#242836] shrink-0 no-print">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#8b5cf6] flex items-center justify-center text-white text-xs font-bold">✿</span>
          <span className="font-semibold text-white text-[15px] tracking-tight">Patty apuntes</span>
          <span className="hidden sm:inline text-[11px] text-[#8b8fa3]">Tus números, en orden</span>
        </div>
        {isEditor && hdr.archivoId && (
          <>
            <div className="h-6 w-px bg-[#242836] hidden sm:block" />
            <input
              value={hdr.titulo}
              onChange={e=>{ hdr.set({ titulo: e.target.value }); hdr.setDirty(true) }}
              onBlur={e=>hdr.onSaveTitle?.(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") (e.target as HTMLInputElement).blur() }}
              placeholder="Nombre del archivo"
              className="hidden md:block bg-[#1a1d27] border border-[#2a2e3e] rounded-lg px-3 py-[5px] text-[13px] text-[#e2e4ed] w-[260px] focus:outline-none focus:border-[#EC4899]/40 placeholder:text-[#8b8fa3]"
            />
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="hidden md:flex items-center gap-1 bg-[#1a1d27] border border-[#2a2e3e] rounded-lg px-2.5 py-1 text-[12px] text-[#e2e4ed]">
          <span>100%</span>
          <span className="text-[#8b8fa3] text-[10px]">▾</span>
        </div>
        {isEditor && (
          <button
            onClick={() => setPreview(!preview)}
            className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-[6px] text-[13px] border transition ${preview ? "bg-[#1e2230] border-[#EC4899]/40 text-white" : "bg-[#1a1d27] border-[#2a2e3e] text-[#c8ccdb]"}`}
          >
            <Eye className="w-3.5 h-3.5" />
            Vista previa
          </button>
        )}
        <div className="hidden lg:flex items-center gap-0.5 bg-[#1a1d27] border border-[#2a2e3e] rounded-lg p-1">
          <button className="w-7 h-6 flex items-center justify-center rounded hover:bg-[#1e2230] text-[#8b8fa3]"><Undo2 className="w-3.5 h-3.5" /></button>
          <button className="w-7 h-6 flex items-center justify-center rounded hover:bg-[#1e2230] text-[#8b8fa3]"><Redo2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {isEditor && hdr.archivoId && (
          <span className="hidden xl:flex items-center gap-1.5 text-[12px] text-[#8b8fa3]">
            <span className={`w-2 h-2 rounded-full inline-block ${hdr.dirty ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
            {hdr.dirty ? "Sin guardar" : "Guardado"} · {hdr.filas} filas
          </span>
        )}
        <span className="hidden sm:flex items-center gap-2 text-xs text-[#8b8fa3]">
          <span className="w-7 h-7 rounded-full bg-[#1a1d27] border border-[#2a2e3e] grid place-items-center text-[10px] font-bold text-white">
            {(user?.full_name?.[0] ?? "P").toUpperCase()}
          </span>
          <span className="hidden lg:inline text-[#e2e4ed] text-[13px]">{user?.full_name ?? "Patty"}</span>
        </span>
        {isEditor && hdr.archivoId && (
          <button onClick={()=>hdr.onExport?.("pdf")} className="bg-[#c084fc] hover:bg-[#a78bfa] text-[#0f1117] font-medium rounded-lg px-4 py-[6px] text-[13px] flex items-center gap-1.5 transition">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
        )}
        <button onClick={()=>{ logout(); nav("/login") }} className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg text-[#8b8fa3] hover:bg-[#1a1d27] hover:text-white">
          <LogOut className="w-4 h-4" />
        </button>
        <button className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg text-[#8b8fa3] hover:bg-[#1a1d27] hover:text-white">
          <Sun className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

export function Layout() {
  return (
    <div className="h-screen flex flex-col bg-[#0f1117] text-[#e2e4ed] overflow-hidden">
      <Topbar />
      <div className="flex flex-1 min-h-0">
        <Rail />
        <div className="flex-1 flex min-h-0 bg-[#0f1117]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
