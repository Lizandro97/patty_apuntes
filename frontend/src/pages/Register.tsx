import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/lib/api"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useAuthStore } from "@/stores/auth"
import { ArrowUpRight, Leaf } from "lucide-react"

const schema = z.object({ full_name: z.string().min(2, "Mínimo 2 caracteres"), email: z.string().email("Email no válido"), password: z.string().min(6, "Mínimo 6 caracteres") })

export function Register() {
  const nav = useNavigate()
  const { setAuth } = useAuthStore()
  const [err,setErr]=useState("")
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  const onSubmit = async (v:any) => {
    try {
      await api.post("/auth/register", v)
      const r = await api.post("/auth/login", { email: v.email, password: v.password })
      const me = await api.get("/auth/me", { headers:{ Authorization:`Bearer ${r.data.access_token}`}})
      setAuth(r.data.access_token, me.data); nav("/")
    } catch(e:any){ setErr(e.response?.data?.detail ?? "Error") }
  }
  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Left — Editorial */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-8 lg:p-12 xl:p-16 min-h-[50dvh] lg:min-h-[100dvh] bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 text-white">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: `radial-gradient(circle at 30% 20%, white 1px, transparent 1px)`, backgroundSize: `24px 24px`}} />
        <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full bg-white/10 blur-[80px] pointer-events-none" />
        
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 backdrop-blur">
            <span className="w-6 h-6 rounded-full bg-white text-violet-600 grid place-items-center"><Leaf size={12} strokeWidth={1.5}/></span>
            <span className="text-[11px] tracking-[0.14em] uppercase font-semibold text-white">Nueva cuenta</span>
          </div>
        </div>

        <div className="relative max-w-[560px] py-8">
          <h1 className="font-display text-[44px] lg:text-[56px] leading-[0.9] tracking-tight">
            Empieza con <br />
            <span className="italic font-normal text-violet-200">orden.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-violet-100 max-w-[44ch]">
            Crea tu espacio. Tus empresas, tus años, tus colores — todo guardado para ti. Sin plantillas, solo tu papel.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {["Sin ruido", "100% tuyo", "PDF · Excel"].map(t=>(
              <span key={t} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-white backdrop-blur">{t}</span>
            ))}
          </div>

          <div className="mt-10 hidden lg:block">
            <div className="bg-white/10 border border-white/15 backdrop-blur rounded-[1.5rem] p-3">
              <div className="bg-white rounded-[1.1rem] p-5 shadow-soft-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#6366F1] text-white grid place-items-center text-xs font-bold">P</div>
                  <div>
                    <div className="text-sm font-semibold leading-none text-[#1E293B]">Patty</div>
                    <div className="text-xs text-[#94A3B8]">Organización es crecer</div>
                  </div>
                  <span className="ml-auto text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">● Activa</span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden p-0.5"><div className="h-full w-[72%] bg-[#6366F1] rounded-full"/></div>
                  <div className="flex justify-between text-[11px] text-[#94A3B8] font-mono"><span>Progreso</span><span>72%</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-violet-200">
          <span className="w-8 h-px bg-white/30"/> Hecho para crecer, no solo para contar
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 bg-[#F8FAFC]">
        <div className="w-full max-w-[440px]">
          <div className="bezel-outer">
            <div className="bezel-inner p-8 lg:p-9">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 grid place-items-center text-white shadow-soft"><span className="font-display font-bold text-lg">P</span></div>
                <span className="text-[11px] tracking-[0.14em] uppercase font-semibold text-[#94A3B8]">Crear cuenta</span>
              </div>
              
              <h2 className="font-display text-[28px] leading-none tracking-tight text-[#1E293B] mt-6">Crea tu papel</h2>
              <p className="text-sm text-[#64748B] mt-2">Empieza a organizar tus revisiones hoy.</p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium tracking-wide text-[#1E293B]">Nombre completo</label>
                  <Input placeholder="Patty Flores" {...register("full_name")} className="h-11 rounded-full bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium tracking-wide text-[#1E293B]">Email</label>
                  <Input placeholder="patty@apuntes.pe" {...register("email")} className="h-11 rounded-full bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium tracking-wide text-[#1E293B]">Contraseña</label>
                  <Input placeholder="••••••••" type="password" {...register("password")} className="h-11 rounded-full bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/10" />
                  <p className="text-[11px] text-[#94A3B8]">Mínimo 6 caracteres — tu papel, tu llave.</p>
                </div>
                {err && <div className="text-sm text-[#EF4444] bg-[#FEF2F2] border border-red-200 p-3 rounded-2xl">{err}</div>}
                <Button disabled={isSubmitting} className="w-full h-11 rounded-full bg-[#6366F1] hover:bg-[#5458E8] text-white shadow-soft gap-2 group" type="submit">
                  Registrarme
                  <span className="w-7 h-7 rounded-full bg-white/20 grid place-items-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                    <ArrowUpRight size={14} strokeWidth={1.5}/>
                  </span>
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E2E8F0]"/>
                <span className="text-xs text-[#94A3B8]">o</span>
                <div className="h-px flex-1 bg-[#E2E8F0]"/>
              </div>

              <p className="text-sm text-center mt-6 text-[#475569]"><Link to="/login" className="font-semibold text-[#6366F1] hover:text-[#5458E8] underline underline-offset-4">Ya tengo cuenta</Link></p>
            </div>
          </div>
          <p className="text-center text-xs text-[#94A3B8] mt-4">Papel privado • Cifrado • Tuyo</p>
        </div>
      </div>
    </div>
  )
}
