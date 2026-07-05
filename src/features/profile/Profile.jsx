import { useState, useEffect } from "react";
import { UserRound, Shield, Lock, Check, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../auth/index.jsx";
import { useI18n } from "../../i18n/index.jsx";
import { cn } from "../../lib/utils.js";
import Btn from "../../components/Btn.jsx";

export default function Profile() {
  const { t } = useI18n();
  const { user, updateProfile, updatePassword } = useAuth();
  const [tab, setTab] = useState("account"); // "account" | "security"

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 disabled:bg-slate-50 dark:disabled:bg-zinc-950 disabled:text-slate-400 dark:disabled:text-zinc-500 disabled:cursor-not-allowed";
  const labelCls =
    "text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase";
  const cardCls =
    "rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5";
  const toggleCls =
    "absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition";

  const tabBtn = (id, label, Icon) => (
    <button type="button" onClick={() => setTab(id)}
      className={cn(
        "flex items-center gap-2 pb-2.5 text-sm font-mono border-b-2 -mb-px transition-colors",
        tab === id
          ? "text-emerald-600 dark:text-emerald-400 border-emerald-500 font-semibold"
          : "text-slate-400 dark:text-zinc-500 border-transparent hover:text-slate-600 dark:hover:text-zinc-300"
      )}>
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="animate-fade-in space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <span className="grid place-items-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xl font-mono font-bold shrink-0">
          {userInitial}
        </span>
        <div className="space-y-1">
          <div className={labelCls}>{t("profile.eyebrow")}</div>
          <h1 className="text-2xl font-extrabold font-mono tracking-tight leading-none text-slate-900 dark:text-zinc-50">
            {t("profile.title")}
          </h1>
          {user?.email && <div className="font-mono text-xs text-slate-400 dark:text-zinc-500">{user.email}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-zinc-800">
        {tabBtn("account", t("profile.tabAccount"), UserRound)}
        {tabBtn("security", t("profile.tabSecurity"), Shield)}
      </div>

      {tab === "account" ? <AccountTab {...{ user, updateProfile, t, inputCls, labelCls, cardCls }} /> : null}
      {tab === "security" ? <SecurityTab {...{ updatePassword, t, inputCls, labelCls, cardCls, toggleCls }} /> : null}
    </div>
  );
}

function AccountTab({ user, updateProfile, t, inputCls, labelCls, cardCls }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(id);
  }, [saved]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const { error: err } = await updateProfile(name);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
  };

  return (
    <form onSubmit={submit} className={cardCls}>
      <div className="space-y-1.5">
        <label className={labelCls}>{t("profile.email")}</label>
        <div className="relative">
          <input type="email" value={user?.email || ""} disabled className={cn(inputCls, "pr-10")} />
          <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-zinc-600" />
        </div>
        <div className="font-mono text-[11px] text-slate-400 dark:text-zinc-600">{t("profile.emailLocked")}</div>
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>{t("profile.displayName")}</label>
        <input type="text" value={name} placeholder={t("profile.namePlaceholder")}
          onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>

      {error && <div className="text-xs font-mono text-rose-600 dark:text-rose-400">{error}</div>}

      <div className="flex items-center gap-3">
        <Btn variant="primary" size="md" disabled={busy}>
          <Check size={15} /> {busy ? t("profile.saving") : t("profile.save")}
        </Btn>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} /> {t("profile.saved")}
          </span>
        )}
      </div>
    </form>
  );
}

function SecurityTab({ updatePassword, t, inputCls, labelCls, cardCls, toggleCls }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ok) return;
    const id = setTimeout(() => setOk(false), 2600);
    return () => clearTimeout(id);
  }, [ok]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setOk(false);
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
    setPassword("");
    setConfirm("");
    setOk(true);
  };

  const field = (label, value, onChange) => (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} autoComplete="new-password" required value={value}
          onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "pr-10")} />
        <button type="button" onClick={() => setShow((s) => !s)} className={toggleCls}
          aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className={cardCls}>
      <div className="space-y-1">
        <div className="text-sm font-mono font-semibold text-slate-800 dark:text-zinc-100">{t("profile.changePassword")}</div>
        <div className="font-mono text-xs text-slate-400 dark:text-zinc-500">{t("profile.changePasswordHint")}</div>
      </div>

      {field(t("auth.newPassword"), password, setPassword)}
      {field(t("auth.confirmPassword"), confirm, setConfirm)}

      {error && (
        <div className="flex items-center gap-1.5 text-xs font-mono text-rose-600 dark:text-rose-400">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Btn variant="primary" size="md" disabled={busy}>
          <Check size={15} /> {t("auth.updatePassword")}
        </Btn>
        {ok && (
          <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} /> {t("profile.passwordChanged")}
          </span>
        )}
      </div>
    </form>
  );
}
