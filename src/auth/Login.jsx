import { useState } from "react";
import { Wallet, ArrowLeft, Eye, EyeOff, ArrowBigUp, ShieldCheck, CreditCard, Lock, Globe, TrendingUp, Check, Sun, Moon } from "lucide-react";
import { useAuth } from "./index.jsx";
import { useI18n } from "../i18n/index.jsx";
import { setRememberSession } from "../supabaseClient.js";
import Btn from "../components/Btn.jsx";
import { cn } from "../lib/utils.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordScore(v) {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  return Math.min(s, 4);
}

export default function Login({ onBack }) {
  const { t, lang, setLang, theme, setTheme } = useI18n();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "reset"
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [emailErr, setEmailErr] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === "signup";
  const isReset = mode === "reset";
  const score = passwordScore(password);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setEmailErr(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const validEmail = EMAIL_RE.test(email);
    setEmailErr(!validEmail);
    if (!validEmail) return;

    setBusy(true);
    if (isReset) {
      const { error: err } = await resetPassword(email);
      setBusy(false);
      if (err) return setError(err.message);
      setInfo(t("auth.resetEmailSent"));
      return;
    }

    if (!isSignUp) setRememberSession(remember);
    const { data, error: err } = isSignUp
      ? await signUp(email, password, fullName)
      : await signIn(email, password);
    setBusy(false);
    if (err) return setError(err.message);
    if (isSignUp && !data.session) setInfo(t("auth.checkEmail"));
  };

  const title = isReset ? t("auth.resetTitle") : isSignUp ? t("auth.createTitle") : t("auth.welcomeBack");
  const subtitle = isReset ? "" : isSignUp ? t("auth.createSubtitle") : t("auth.welcomeSubtitle");
  const submitLabel = isReset ? t("auth.sendResetLink") : isSignUp ? t("auth.signUp") : t("auth.signIn");

  const fieldCls =
    "w-full h-11 px-3 rounded-lg border bg-white dark:bg-zinc-900 text-sm font-mono text-slate-800 dark:text-zinc-100 focus:outline-none transition-colors";
  const fieldBorder = (err) => (err ? "border-rose-500 focus:border-rose-500" : "border-slate-200 dark:border-zinc-700 focus:border-emerald-500");
  const labelCls = "text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase block mb-1.5";

  const strengthColor = ["bg-rose-500", "bg-amber-500", "bg-amber-500", "bg-emerald-500"][score - 1] || "bg-slate-200 dark:bg-zinc-700";
  const strengthWord = [t("auth.strengthWeak"), t("auth.strengthFair"), t("auth.strengthGood"), t("auth.strengthStrong")][score - 1];

  return (
    <div className="grid lg:grid-cols-2 min-h-screen bg-white dark:bg-zinc-950">
      {/* LEFT: form */}
      <div className="flex flex-col px-6 sm:px-10 py-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40">
              <Wallet size={16} className="text-emerald-600 dark:text-emerald-400" />
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-zinc-100 tracking-tight">{t("expenses.brand")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-zinc-800 overflow-hidden text-xs font-mono font-semibold">
              {[{ code: "es", label: "ES" }, { code: "en", label: "EN" }].map(({ code, label }) => (
                <button key={code} type="button" onClick={() => setLang(code)}
                  className={cn("px-2.5 py-1.5 transition-colors", lang === code ? "bg-emerald-500 text-white" : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800")}>
                  {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 px-2.5 py-1.5 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px] py-10">
            {onBack && (
              <button type="button" onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition mb-6">
                <ArrowLeft size={14} /> {t("auth.backHome")}
              </button>
            )}

            <h1 className="text-2xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-zinc-50">{title}</h1>
            {subtitle && <p className="text-sm font-mono text-slate-400 dark:text-zinc-500 mt-1.5">{subtitle}</p>}

            {!isReset && (
              <div className="flex p-1 gap-1 mt-6 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900">
                {[{ id: "signin", label: t("auth.signIn") }, { id: "signup", label: t("auth.signUpTitle") }].map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => switchMode(id)}
                    className={cn("flex-1 h-8 rounded-lg text-xs font-mono font-semibold transition-colors",
                      mode === id ? "bg-emerald-500 text-white" : "text-slate-500 dark:text-zinc-400")}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={submit} className={cn("space-y-4", isReset ? "mt-6" : "mt-5")} noValidate>
              {isSignUp && (
                <div>
                  <label className={labelCls}>{t("auth.fullName")}</label>
                  <input type="text" autoComplete="name" value={fullName}
                    onChange={(e) => setFullName(e.target.value)} className={cn(fieldCls, fieldBorder(false))} />
                </div>
              )}

              <div>
                <label className={labelCls}>{t("auth.email")}</label>
                <input type="email" autoComplete="email" required value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailErr(false); }}
                  className={cn(fieldCls, fieldBorder(emailErr))} />
                {emailErr && <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400 mt-1">{t("auth.emailInvalid")}</div>}
              </div>

              {!isReset && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("auth.password")}</label>
                    {!isSignUp && (
                      <button type="button" onClick={() => switchMode("reset")}
                        className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                        {t("auth.forgotPassword")}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input type={show ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} required value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={(e) => setCaps(e.getModifierState && e.getModifierState("CapsLock"))}
                      onBlur={() => setCaps(false)}
                      className={cn(fieldCls, "pr-10", fieldBorder(false))} />
                    <button type="button" onClick={() => setShow((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}>
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {caps && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-500 mt-1">
                      <ArrowBigUp size={13} /> {t("auth.capsLock")}
                    </div>
                  )}
                  {isSignUp && (
                    <div className="mt-2">
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className={cn("h-1 flex-1 rounded-full", i < score ? strengthColor : "bg-slate-200 dark:bg-zinc-700")} />
                        ))}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-600 mt-1">
                        {password ? `${strengthWord}` : t("auth.strengthHint")}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isSignUp && !isReset && (
                <label className="flex items-center gap-2.5 text-xs font-mono text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500" />
                  {t("auth.keepSignedIn")}
                </label>
              )}

              {error && <div className="text-xs font-mono text-rose-600 dark:text-rose-400">{error}</div>}
              {info && <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{info}</div>}

              <Btn variant="primary" size="md" className="w-full justify-center" disabled={busy}>
                {submitLabel}
              </Btn>

              {isReset && (
                <button type="button" onClick={() => switchMode("signin")}
                  className="w-full text-center text-xs font-mono text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  {t("auth.toSignIn")}
                </button>
              )}
            </form>

            {!isReset && (
              <div className="flex items-center justify-center gap-2 mt-6 text-[11px] font-mono text-slate-400 dark:text-zinc-600">
                <ShieldCheck size={14} className="text-emerald-500" />
                {t("auth.trustEncrypted")}
              </div>
            )}
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-600">
          © 2026 {t("expenses.brand")} · <button type="button" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">{t("auth.privacy")}</button> · <button type="button" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">{t("auth.terms")}</button>
        </div>
      </div>

      {/* RIGHT: brand panel */}
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-center px-14 border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 78% 8%, rgba(16,185,129,.16), transparent 55%), radial-gradient(90% 70% at 10% 100%, rgba(16,185,129,.08), transparent 60%)",
        }}>
        {/* faint grid, masked to a soft circle */}
        <div className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(120,120,120,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(120,120,120,.10) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(circle at 60% 30%, #000 30%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(circle at 60% 30%, #000 30%, transparent 78%)",
          }} />
        <div className="relative max-w-[440px]">
          <div className="text-[11px] font-mono tracking-widest uppercase text-emerald-600 dark:text-emerald-400">{t("auth.brandEyebrow")}</div>
          <h2 className="text-[34px] leading-[1.08] font-extrabold font-mono tracking-tight mt-3 text-slate-900 dark:text-zinc-50">
            {t("auth.brandHeadline1")}<br />
            <span className="text-emerald-600 dark:text-emerald-400">{t("auth.brandHeadline2")}</span>
          </h2>
          <p className="text-sm leading-relaxed mt-4 text-slate-500 dark:text-zinc-400">{t("auth.brandBody")}</p>

          <div className="relative mt-9">
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-slate-300 dark:bg-zinc-700" />)}
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 dark:text-zinc-500">April 2026</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-3.5">
                  <div className="text-[9px] font-mono tracking-widest uppercase text-slate-400 dark:text-zinc-500">Net balance</div>
                  <div className="text-lg font-bold font-mono mt-1 text-slate-900 dark:text-zinc-50">$4,820,000</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp size={11} /> +12.4%
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-3.5">
                  <div className="text-[9px] font-mono tracking-widest uppercase text-slate-400 dark:text-zinc-500">Savings rate</div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="relative h-11 w-11 rounded-full" style={{ background: "conic-gradient(#10b981 0 32%, rgba(120,120,120,.2) 32% 100%)" }}>
                      <div className="absolute inset-[4px] rounded-full bg-slate-50 dark:bg-zinc-950" />
                    </div>
                    <div>
                      <div className="text-base font-bold font-mono leading-none text-slate-900 dark:text-zinc-50">32%</div>
                      <div className="text-[9px] font-mono mt-0.5 text-slate-400 dark:text-zinc-500">of income</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-3.5 mt-3">
                <div className="text-[9px] font-mono tracking-widest uppercase text-slate-400 dark:text-zinc-500 mb-2.5">Income vs. expenses</div>
                <div className="flex items-end justify-between gap-2 h-[54px]">
                  {[[34, 26], [44, 30], [38, 46], [52, 34]].map(([a, b], i) => (
                    <div key={i} className="flex items-end gap-1 flex-1 justify-center">
                      <span className="w-2 rounded-sm bg-emerald-500" style={{ height: a }} />
                      <span className="w-2 rounded-sm bg-rose-400" style={{ height: b }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Check size={14} />
              </span>
              <div>
                <div className="text-[11px] font-mono font-semibold leading-none text-slate-800 dark:text-zinc-100">Rent paid</div>
                <div className="text-[10px] font-mono mt-1 text-slate-400 dark:text-zinc-500">$1,750,000</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 mt-9">
            {[{ Icon: CreditCard, label: t("auth.chipNoCard") }, { Icon: Lock, label: t("auth.chipPrivate") }, { Icon: Globe, label: t("auth.chipCurrency") }].map(({ Icon, label }, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                <Icon size={13} className="text-emerald-500" /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
