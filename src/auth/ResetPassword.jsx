import { useState } from "react";
import { Wallet, Eye, EyeOff } from "lucide-react";
import { useAuth } from "./index.jsx";
import { useI18n } from "../i18n/index.jsx";
import Btn from "../components/Btn.jsx";

export default function ResetPassword() {
  const { t } = useI18n();
  const { updatePassword, setRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setBusy(true);
    const { error: err } = await updatePassword(password);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    // Clearing the flag drops through to the authenticated app shell.
    setRecovery(false);
  };

  const inputCls =
    "w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-emerald-500";

  const toggleCls =
    "absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition";

  const field = (label, value, onChange) => (
    <div>
      <label className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} autoComplete="new-password" required value={value}
          onChange={(e) => onChange(e.target.value)} className={inputCls} />
        <button type="button" onClick={() => setShow((s) => !s)} className={toggleCls}
          aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center">
            <Wallet size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="font-mono font-bold text-slate-800 dark:text-zinc-100">
            {t("auth.resetTitle")}
          </h1>
        </div>

        <div className="space-y-3">
          {field(t("auth.newPassword"), password, setPassword)}
          {field(t("auth.confirmPassword"), confirm, setConfirm)}
        </div>

        {error && <div className="text-xs font-mono text-rose-600 dark:text-rose-400">{error}</div>}

        <Btn variant="primary" size="md" className="w-full justify-center" disabled={busy}>
          {t("auth.updatePassword")}
        </Btn>
      </form>
    </div>
  );
}
