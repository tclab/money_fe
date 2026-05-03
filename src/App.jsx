import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Menu, X, Wallet, BookOpen, Users, Target, Settings } from "lucide-react";
import { useI18n } from "./i18n/index.jsx";
import { cn } from "./lib/utils.js";
import Modal from "./components/Modal.jsx";
import Btn from "./components/Btn.jsx";
import Expenses from "./features/expenses/Expenses.jsx";
import Splitter from "./features/splitter/Splitter.jsx";
import DebtKiller from "./features/debtKiller/DebtKiller.jsx";

export default function App() {
  const { t, lang, setLang, theme, setTheme } = useI18n();
  const [tab, setTab] = useState("expenses");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const navItems = [
    { id: "expenses", label: t("nav.expenses"), Icon: BookOpen },
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
      {/* Brand */}
      <div className={cn("flex items-center mb-4", collapsed ? "justify-center" : "gap-2.5 px-1")}>
        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center shrink-0">
          <Wallet size={14} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        {!collapsed && <span className="font-mono font-bold text-slate-800 dark:text-zinc-100 text-sm tracking-wide">{t("expenses.brand")}</span>}
      </div>

      <div className="px-1 mb-1 flex items-center gap-2">
        <button onClick={() => setCollapsed((v) => !v)} className="text-slate-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors">
          <Menu size={14} />
        </button>
        {!collapsed && (
          <span className="font-mono text-xs font-semibold text-slate-400 dark:text-zinc-600 uppercase tracking-widest">{t("nav.menu")}</span>
        )}
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0">
        {navItems.map(({ id, label, Icon }) => <NavItem key={id} id={id} label={label} Icon={Icon} />)}
      </div>

      <div className="mt-auto">
        <div className="border-t border-slate-200 dark:border-zinc-800 pt-3">
          <button onClick={() => setPrefsOpen(true)}
            className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors", collapsed ? "justify-center" : "")}>
            <Settings size={15} className="shrink-0" />
            {!collapsed && <span className="text-xs font-mono font-medium">{t("nav.settings")}</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center">
            <Wallet size={12} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 text-sm">
            {tab === "splitter" ? t("nav.splitter") : tab === "debtKiller" ? t("nav.debtKiller") : t("nav.expenses")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => setMobileMenuOpen((v) => !v)} className="p-2 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
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

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto mt-14 md:mt-0 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {tab === "expenses" && <Expenses />}
            {tab === "splitter" && <Splitter />}
            {tab === "debtKiller" && <DebtKiller />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Preferences modal */}
      <Modal open={prefsOpen} onClose={() => setPrefsOpen(false)} title={t("nav.settings")}
        actions={<Btn variant="primary" size="md" onClick={() => setPrefsOpen(false)}>{t("btn.save")}</Btn>}>
        <div className="space-y-5">
          {/* Language */}
          <div>
            <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase mb-2">{t("prefs.language")}</div>
            <div className="flex gap-2">
              {[{ code: "es", label: "Español" }, { code: "en", label: "English" }].map(({ code, label }) => (
                <button key={code} onClick={() => setLang(code)}
                  className={cn("flex-1 py-2 rounded-lg border text-sm font-mono font-medium transition",
                    lang === code
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase mb-2">{t("prefs.theme")}</div>
            <div className="flex gap-2">
              {[{ value: "light", label: t("theme.light"), Icon: Sun }, { value: "dark", label: t("theme.dark"), Icon: Moon }].map(({ value, label, Icon }) => (
                <button key={value} onClick={() => setTheme(value)}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-mono font-medium transition",
                    theme === value
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                  )}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
