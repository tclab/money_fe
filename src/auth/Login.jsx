import { useState } from "react";
import { Wallet, ArrowLeft } from "lucide-react";
import { useAuth } from "./index.jsx";
import { useI18n } from "../i18n/index.jsx";
import Btn from "../components/Btn.jsx";

export default function Login({ onBack }) {
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === "signup";

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const { data, error: err } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    // Sign-up with email confirmation returns a user but no active session.
    if (isSignUp && !data.session) {
      setInfo(t("auth.checkEmail"));
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-emerald-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
        {onBack && (
          <button type="button" onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition">
            <ArrowLeft size={14} /> {t("nav.menu")}
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center">
            <Wallet size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="font-mono font-bold text-slate-800 dark:text-zinc-100">
            {isSignUp ? t("auth.signUpTitle") : t("auth.signInTitle")}
          </h1>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("auth.email")}</label>
            <input type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("auth.password")}</label>
            <input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} required value={password}
              onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </div>
        </div>

        {error && <div className="text-xs font-mono text-rose-600 dark:text-rose-400">{error}</div>}
        {info && <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{info}</div>}

        <Btn variant="primary" size="md" className="w-full justify-center" disabled={busy}>
          {isSignUp ? t("auth.signUp") : t("auth.signIn")}
        </Btn>

        <button type="button" onClick={() => { setMode(isSignUp ? "signin" : "signup"); setError(null); setInfo(null); }}
          className="w-full text-center text-xs font-mono text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition">
          {isSignUp ? t("auth.toSignIn") : t("auth.toSignUp")}
        </button>
      </form>
    </div>
  );
}
