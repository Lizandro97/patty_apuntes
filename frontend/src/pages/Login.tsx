import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/lib/api"
import { apiError } from "@/lib/errors"
import { useAuthStore } from "@/stores/auth"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ArrowUpRight, Check, ShieldCheck, Sparkles } from "lucide-react"

export function Login() {
  const { t } = useTranslation()
  const schema = z.object({ email: z.string().email(t("auth.login.invalidEmail")), password: z.string().min(6, t("auth.login.minChars")) })
  const { setAuth } = useAuthStore()
  const nav = useNavigate()
  const [err, setErr] = useState("")
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (v: any) => {
    try {
      const r = await api.post("/auth/login", v)
      const me = await api.get("/auth/me", { headers: { Authorization: `Bearer ${r.data.access_token}` } })
      setAuth(r.data.access_token, me.data)
      nav("/")
    } catch (e:any) { setErr(apiError(t, e.response?.data?.detail, "auth.login.loginError")) }
  }

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Left — Editorial con identidad original */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-8 lg:p-12 xl:p-16 min-h-[50dvh] lg:min-h-[100dvh] bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 text-white">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: `radial-gradient(circle at 30% 20%, white 1px, transparent 1px)`, backgroundSize: `24px 24px`}} />
        <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-white/10 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full bg-indigo-300/20 blur-[80px] pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 backdrop-blur">
            <span className="w-6 h-6 rounded-full bg-white text-violet-600 grid place-items-center"><Sparkles size={12} strokeWidth={1.5}/></span>
            <span className="text-[11px] tracking-[0.14em] uppercase font-semibold text-white">{t("auth.login.brandTag")}</span>
          </div>
        </div>

        <div className="relative max-w-[560px] py-8">
          <h1 className="font-display text-[44px] lg:text-[58px] leading-[0.9] tracking-tight">
            {t("auth.login.heroTitleA")} <br />
            <span className="italic font-normal text-violet-200">{t("auth.login.heroTitleB")}</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-violet-100 max-w-[44ch]">
            {t("auth.login.heroDesc")}
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-[420px]">
            {[
              { k: t("auth.login.statRows"), v: t("auth.login.statRowsV") },
              { k: t("auth.login.statYears"), v: t("auth.login.statYearsV") },
              { k: t("auth.login.statExport"), v: t("auth.login.statExportV") },
            ].map(s => (
              <div key={s.k} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur p-3">
                <div className="text-[11px] tracking-wide uppercase font-semibold text-violet-200">{s.k}</div>
                <div className="text-sm font-semibold text-white">{s.v}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 hidden lg:block">
            <div className="bg-white/10 border border-white/15 backdrop-blur rounded-[1.5rem] p-3">
              <div className="bg-white rounded-[1.1rem] p-4 shadow-soft-lg">
                <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]"><div className="w-2 h-2 rounded-full bg-emerald-500"/> {t("auth.login.previewCaption")}</div>
                <div className="mt-3 grid grid-cols-12 gap-1">
                  {Array.from({length: 36}).map((_,i)=>(
                    <div key={i} className={`h-6 rounded-lg border flex items-center justify-center text-[10px] ${i%7===0 ? "bg-[#6366F1] text-white border-[#6366F1]" : "bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]"}`}>{i%7===0 ? "✓" : "·"}</div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-[#64748B]"><Check size={12} strokeWidth={1.5}/> {t("auth.login.previewHint")}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-violet-200">
          <span className="w-8 h-px bg-white/30"/> {t("auth.login.footerTag")}
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 bg-[#F8FAFC]">
        <div className="w-full max-w-[440px]">
          <div className="bezel-outer">
            <div className="bezel-inner p-8 lg:p-9">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 grid place-items-center text-white shadow-soft"><span className="font-display font-bold text-lg">P</span></div>
                <span className="text-[11px] tracking-[0.14em] uppercase font-semibold text-[#94A3B8]">{t("auth.login.access")}</span>
              </div>

              <h2 className="font-display text-[28px] leading-none tracking-tight text-[#1E293B] mt-6">{t("auth.login.welcome")}</h2>
              <p className="text-sm text-[#64748B] mt-2">{t("auth.login.welcomeDesc")}</p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium tracking-wide text-[#1E293B]">{t("auth.login.email")}</label>
                  <Input placeholder="patty@apuntes.pe" {...register("email")} className="h-11 rounded-full bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/10" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between"><label className="text-xs font-medium tracking-wide text-[#1E293B]">{t("auth.login.password")}</label><span className="text-xs text-[#94A3B8] flex items-center gap-1"><ShieldCheck size={12} strokeWidth={1.5}/> {t("auth.login.secure")}</span></div>
                  <Input placeholder="••••••••" type="password" {...register("password")} className="h-11 rounded-full bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#6366F1]/30 focus:ring-4 focus:ring-[#6366F1]/10" />
                </div>
                {err && <div className="text-sm text-[#EF4444] bg-[#FEF2F2] border border-red-200 p-3 rounded-2xl">{err}</div>}
                <Button disabled={isSubmitting} className="w-full h-11 rounded-full bg-[#6366F1] hover:bg-[#5458E8] text-white shadow-soft gap-2 group" type="submit">
                  {t("auth.login.submit")}
                  <span className="w-7 h-7 rounded-full bg-white/20 grid place-items-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                    <ArrowUpRight size={14} strokeWidth={1.5}/>
                  </span>
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E2E8F0]"/>
                <span className="text-xs text-[#94A3B8]">{t("auth.login.or")}</span>
                <div className="h-px flex-1 bg-[#E2E8F0]"/>
              </div>

              <p className="text-sm text-center mt-6 text-[#475569]">{t("auth.login.noAccount")} <Link to="/register" className="font-semibold text-[#6366F1] hover:text-[#5458E8] underline underline-offset-4">{t("auth.login.registerLink")}</Link></p>
            </div>
          </div>
          <p className="text-center text-xs text-[#94A3B8] mt-4">{t("auth.login.footerCopy", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </div>
  )
}
