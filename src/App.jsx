import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Menu, X, Wallet, LayoutDashboard, BookOpen, TrendingUp, Receipt, Users, Target, LogOut, ChevronDown } from "lucide-react";
import { useI18n } from "./i18n/index.jsx";
import { useAuth } from "./auth/index.jsx";
import { cn } from "./lib/utils.js";
import Login from "./auth/Login.jsx";
import Dashboard from "./features/dashboard/Dashboard.jsx";
import Expenses from "./features/expenses/Expenses.jsx";
import Income from "./features/income/Income.jsx";
import Transactions from "./features/transactions/Transactions.jsx";
import Splitter from "./features/splitter/Splitter.jsx";
import DebtKiller from "./features/debtKiller/DebtKiller.jsx";

export default function App() {
  const { t, lang, setLang, theme, setTheme } = useI18n();
  const { session, user, loading, signOut } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef();

  const userName = (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User");
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => { if (!userMenuRef.current?.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);
  const navItems = [
    { id: "dashboard", label: t("nav.dashboard"), Icon: LayoutDashboard },
    { id: "expenses", label: t("nav.expenses"), Icon: BookOpen },
    { id: "income", label: t("nav.income"), Icon: TrendingUp },
    { id: "transactions", label: t("nav.transactions"), Icon: Receipt },
    { id: "splitter", label: t("nav.splitter"), Icon: Users },
    { id: "debtKiller", label: t("nav.debtKiller"), Icon: Target },
  ];

  const NavItem = ({ id, label, Icon }) => (
    <button onClick={() => { setTab(id); setMobileMenuOpen(false); }} title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-left relative",
        collapsed ? "justify-center" : "",
        tab === id
          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
          : "text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-transparent"
      )}>
      {tab === id && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-500 rounded-r-full" />}
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="font-mono text-sm font-medium">{label}</span>}
    </button>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full gap-1">
      {/* Brand — click to collapse/expand the sidebar */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        title={t("nav.menu")}
        className={cn("flex items-center mb-4 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800", collapsed ? "justify-center p-0.5" : "gap-2.5 px-1 py-0.5")}
      >
        <div className={cn(
          "rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center shrink-0 transition-all",
          collapsed ? "w-10 h-10" : "w-9 h-9"
        )}>
          <Wallet size={collapsed ? 20 : 18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        {!collapsed && <span className="font-mono font-bold text-slate-800 dark:text-zinc-100 text-sm tracking-wide">{t("expenses.brand")}</span>}
      </button>

      <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0">
        {navItems.map(({ id, label, Icon }) => <NavItem key={id} id={id} label={label} Icon={Icon} />)}
      </div>
    </div>
  );

  // Language segmented pill + theme toggle, shared by the top bar and mobile bar.
  const langThemeControls = (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-slate-200 dark:border-zinc-800 overflow-hidden text-xs font-mono font-semibold">
        {[{ code: "es", label: "ES" }, { code: "en", label: "EN" }].map(({ code, label }) => (
          <button key={code} onClick={() => setLang(code)}
            className={cn("px-2.5 py-1.5 transition-colors",
              lang === code
                ? "bg-emerald-500 text-white"
                : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
            )}>
            {label}
          </button>
        ))}
      </div>
      <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? t("theme.light") : t("theme.dark")}
        className="flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 px-2.5 py-1.5 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );

  // Avatar + name + chevron, with a dropdown holding sign out.
  const userMenu = (
    <div className="relative" ref={userMenuRef}>
      <button onClick={() => setUserMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-mono font-bold shrink-0">{userInitial}</span>
        <span className="hidden sm:block max-w-[140px] truncate font-mono text-sm text-slate-700 dark:text-zinc-200">{userName}</span>
        <ChevronDown size={14} className={cn("text-slate-400 dark:text-zinc-500 transition-transform", userMenuOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {userMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1.5 z-50">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="font-mono text-sm text-slate-700 dark:text-zinc-200 truncate">{userName}</div>
              {user?.email && <div className="font-mono text-[11px] text-slate-400 dark:text-zinc-500 truncate">{user.email}</div>}
            </div>
            <button onClick={() => { setUserMenuOpen(false); signOut(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
              <LogOut size={14} className="shrink-0" /> {t("auth.signOut")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileMenuOpen((v) => !v)} className="p-2 -ml-2 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center">
            <Wallet size={12} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 text-sm">
            {tab === "dashboard" ? t("nav.dashboard") : tab === "income" ? t("nav.income") : tab === "transactions" ? t("nav.transactions") : tab === "splitter" ? t("nav.splitter") : tab === "debtKiller" ? t("nav.debtKiller") : t("nav.expenses")}
          </span>
        </div>
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-50 flex">
            <motion.div initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 w-60 p-4 flex flex-col">
              {sidebarContent}
            </motion.div>
            <div className="flex-1 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className={cn("hidden md:flex relative shrink-0 transition-all duration-200 group/sidebar", collapsed ? "w-[60px]" : "w-56")}>
        <aside className="flex flex-col w-full bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 p-3">
          {sidebarContent}
        </aside>
        {/* Resize handle */}
        <div
          onClick={() => setCollapsed((v) => !v)}
          className="absolute top-0 right-0 w-3 h-full cursor-col-resize flex items-center justify-center z-10 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150"
        >
          <div className="w-0.5 h-12 rounded-full bg-emerald-500/60 hover:bg-emerald-500 transition-colors duration-150" />
        </div>
      </div>

      {/* Content column: desktop top bar + main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-end gap-3 h-14 shrink-0 px-6 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
          {langThemeControls}
          <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800" />
          {userMenu}
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto mt-14 md:mt-0 pb-20 md:pb-6 min-h-screen md:min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {tab === "dashboard" && <Dashboard />}
              {tab === "expenses" && <Expenses />}
              {tab === "income" && <Income />}
              {tab === "transactions" && <Transactions />}
              {tab === "splitter" && <Splitter />}
              {tab === "debtKiller" && <DebtKiller />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {navItems.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => { setTab(id); setMobileMenuOpen(false); }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
              tab === id
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-400 dark:text-zinc-500"
            )}>
            <Icon size={19} className="shrink-0" />
            <span className="font-mono text-[9px] font-medium tracking-tight leading-none">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
