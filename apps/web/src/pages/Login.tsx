import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { apiError } from "@/lib/errors"
import { authApi } from "@/shared/api/auth"
import { useAuthStore } from "@/stores/auth"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { ArrowUpRight, Eye, EyeOff, ShieldCheck } from "lucide-react"

export function Login() {
  const { t } = useTranslation()
  const schema = useMemo(() => z.object({ email: z.string().email(t("auth.login.invalidEmail")), password: z.string().min(6, t("auth.login.minChars")) }), [t])
  const setAuth = useAuthStore(s => s.setAuth)
  const nav = useNavigate()
  const [err, setErr] = useState("")
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (v: { email: string; password: string }) => {
    try {
      const s = await authApi.login(v)
      setAuth(s.access_token, s.user, s.refresh_token)
      nav("/")
    } catch (e:any) { setErr(apiError(t, e.response?.data?.detail, "auth.login.loginError")) }
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] flex items-center justify-center">
      <div className="flex items-center justify-center p-6 lg:p-10 bg-[var(--bg)]">
        <div className="w-full max-w-[440px]">
          <div className="bezel-outer">
            <div className="bezel-inner p-8 lg:p-9">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-ink)] grid place-items-center text-[var(--on-accent)] shadow-soft"><span className="font-display font-bold text-lg">P</span></div>
                <span className="text-[11px] tracking-[0.14em] uppercase font-semibold text-[var(--text-dim)]">{t("auth.login.access")}</span>
              </div>

              <h2 className="font-display text-[28px] leading-none tracking-tight text-[var(--text)] mt-6">{t("auth.login.welcome")}</h2>
              <p className="text-sm text-[var(--text-dim)] mt-2">{t("auth.login.welcomeDesc")}</p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-xs font-medium tracking-wide text-[var(--text)]">{t("auth.login.email")}</label>
                  <Input id="login-email" placeholder="patty@apuntes.pe" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} className="h-11 rounded-full" />
                  {errors.email && <p role="alert" className="text-xs text-[var(--danger)]">{String(errors.email.message)}</p>}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between"><label htmlFor="login-password" className="text-xs font-medium tracking-wide text-[var(--text)]">{t("auth.login.password")}</label><span className="text-xs text-[var(--text-dim)] flex items-center gap-1"><ShieldCheck size={12} strokeWidth={1.5}/> {t("auth.login.secure")}</span></div>
                  <div className="relative">
                    <Input id="login-password" placeholder="••••••••" type={showPw ? "text" : "password"} autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} className="h-11 rounded-full pr-11" />
                    <button type="button" onClick={() => setShowPw(v => !v)} aria-label={t(showPw ? "auth.login.hidePassword" : "auth.login.showPassword")} aria-pressed={showPw} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)]">
                      {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {errors.password && <p role="alert" className="text-xs text-[var(--danger)]">{String(errors.password.message)}</p>}
                </div>
                {err && <div role="alert" className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 p-3 rounded-2xl">{err}</div>}
                <Button disabled={isSubmitting} className="w-full h-11 rounded-full gap-2 group" type="submit">
                  {t("auth.login.submit")}
                  <span className="w-7 h-7 rounded-full bg-white/20 grid place-items-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                    <ArrowUpRight size={14} strokeWidth={1.5}/>
                  </span>
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border)]"/>
                <span className="text-xs text-[var(--text-dim)]">{t("auth.login.or")}</span>
                <div className="h-px flex-1 bg-[var(--border)]"/>
              </div>

              <p className="text-sm text-center mt-6 text-[var(--text-dim)]">{t("auth.login.noAccount")} <Link to="/register" className="font-semibold text-[var(--accent)] hover:brightness-110 underline underline-offset-4">{t("auth.login.registerLink")}</Link></p>
            </div>
          </div>
          <p className="text-center text-xs text-[var(--text-dim)] mt-4">{t("auth.login.footerCopy", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </div>
  )
}
