import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown, Cloud, CloudOff,
  GripVertical, LayoutList, TrendingUp, Download, Upload,
  Camera, Globe, Moon, Sun, CheckCircle2, XCircle, Clock, AlertCircle,
  Menu, X, Wallet, BookOpen, Users, Target, Settings,
} from "lucide-react";
import { useI18n } from "./i18n/index.jsx";
import { cn } from "./lib/utils.js";

// ─── SHARED ───────────────────────────────────────────────────────────────────
const toMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const fmt = (n, locale = "es-CO", currency = "COP") =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0 }).format(n || 0);
const fmtMonth = (date, locale = "es-ES") =>
  new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date).toUpperCase();
const STORAGE_EXPENSES = "expense-tracker-all-months";
const STORAGE_FLUJO = "flujo-caja-data";

function exportData(expenses, flujo) {
  const json = JSON.stringify({ expenses, flujo }, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const reader = new FileReader();
  reader.onload = () => {
    const a = document.createElement("a");
    a.href = reader.result;
    a.download = `finanzas-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  reader.readAsDataURL(blob);
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, description, children, actions }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100 mb-1">{title}</h3>
          {description && <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">{description}</p>}
          {children}
          <div className="flex gap-2 justify-end mt-6">{actions}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
function Btn({ onClick, variant = "default", size = "sm", className, children, disabled }) {
  const base = "inline-flex items-center gap-1.5 font-mono font-medium rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2", icon: "p-2" };
  const variants = {
    default: "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700",
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/20",
    danger: "bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60",
    ghost: "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={cn(base, sizes[size], variants[variant], className)}>
      {children}
    </button>
  );
}

// ─── IMPORT/EXPORT BAR ────────────────────────────────────────────────────────
function ImportExportBar({ onExport, onImport }) {
  const { t } = useI18n();
  const fileRef = useRef();
  const [confirmData, setConfirmData] = useState(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { setConfirmData(JSON.parse(ev.target.result)); }
      catch (err) { console.error("Invalid file", err); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex gap-1.5">
        <Btn onClick={() => setShowExportConfirm(true)} className="flex-1 justify-center">
          <Download size={13} /> {t("btn.export")}
        </Btn>
        <Btn onClick={() => fileRef.current.click()} className="flex-1 justify-center">
          <Upload size={13} /> {t("btn.import")}
        </Btn>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
      </div>
      <Modal open={showExportConfirm} onClose={() => setShowExportConfirm(false)}
        title={t("dialog.exportTitle")} description={t("dialog.exportDesc")}
        actions={<>
          <Btn onClick={() => setShowExportConfirm(false)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={() => { onExport(); setShowExportConfirm(false); }}>
            <Download size={14} /> {t("btn.download")}
          </Btn>
        </>} />
      <Modal open={!!confirmData} onClose={() => setConfirmData(null)}
        title={t("dialog.importTitle")} description={t("dialog.importDesc")}
        actions={<>
          <Btn onClick={() => setConfirmData(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={() => { onImport(confirmData); setConfirmData(null); }}>
            {t("btn.confirmImport")}
          </Btn>
        </>} />
    </div>
  );
}

// ─── AMOUNT INPUT ─────────────────────────────────────────────────────────────
function AmountInput({ amount, onChange, className }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  return (
    <input
      type={editing ? "number" : "text"}
      value={editing ? raw : fmt(amount)}
      onChange={(e) => setRaw(e.target.value)}
      onFocus={() => { setRaw(amount === 0 ? "" : String(amount)); setEditing(true); }}
      onBlur={() => { onChange(parseFloat(raw) || 0); setEditing(false); }}
      className={cn(
        "font-mono border-0 focus:ring-1 focus:ring-emerald-500/50 rounded-lg px-2 py-1 bg-slate-100 dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 outline-none transition",
        className
      )}
    />
  );
}

// ─── SYNC BADGE ───────────────────────────────────────────────────────────────
function SyncBadge({ status }) {
  const { t } = useI18n();
  const cfg = {
    saving: { cls: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30", icon: <Cloud size={11} className="animate-pulse" /> },
    saved:  { cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30", icon: <CheckCircle2 size={11} /> },
    error:  { cls: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30", icon: <CloudOff size={11} /> },
    idle:   { cls: "text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700", icon: <Cloud size={11} /> },
  }[status] || { cls: "text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700", icon: <Cloud size={11} /> };
  return (
    <span className={cn("font-mono text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border", cfg.cls)}>
      {cfg.icon} {t(`sync.${status}`)}
    </span>
  );
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  paid:      { cls: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40", icon: <CheckCircle2 size={11} /> },
  unpaid:    { cls: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40", icon: <XCircle size={11} /> },
  scheduled: { cls: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40", icon: <Clock size={11} /> },
  verify:    { cls: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40", icon: <AlertCircle size={11} /> },
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, colorClass, icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white dark:bg-zinc-900 border rounded-xl p-4 flex flex-col gap-2", colorClass)}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{label}</span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <div className="font-mono text-base font-semibold text-slate-900 dark:text-zinc-100 tabular-nums leading-tight">{value}</div>
    </motion.div>
  );
}

// ─── MONTH NAV ────────────────────────────────────────────────────────────────
function MonthNav({ viewDate, onPrev, onNext, hasFuture, syncStatus, isCurrentMonth, lang }) {
  const { t } = useI18n();
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 mb-5 flex items-center justify-between">
      <button onClick={onPrev} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition">
        <ChevronLeft size={20} />
      </button>
      <div className="text-center">
        <h2 className="font-mono text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
          {fmtMonth(viewDate, lang === "en" ? "en-US" : "es-ES")}
        </h2>
        <div className="flex items-center justify-center gap-2 mt-1.5">
          {!isCurrentMonth && (
            <span className="font-mono text-xs bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-full">
              {t("state.readonly")}
            </span>
          )}
          <SyncBadge status={syncStatus} />
        </div>
      </div>
      <button onClick={onNext} disabled={!hasFuture} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition disabled:opacity-20 disabled:cursor-not-allowed">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

// ─── EXPENSE TRACKER ─────────────────────────────────────────────────────────
const DEFAULT_TEMPLATE = {
  FIJOS: [
    { id: 1, name: "Inversión", amount: 100000 }, { id: 2, name: "Ahorro", amount: 4000000 },
    { id: 3, name: "Arriendo", amount: 4734000 }, { id: 4, name: "Seguro carro", amount: 460000 },
    { id: 5, name: "EPM", amount: 263489 }, { id: 6, name: "Claro cel", amount: 56000 },
    { id: 7, name: "Claro internet", amount: 99000 }, { id: 8, name: "Internet 4g", amount: 60000 },
  ],
  TARJETAS: [
    { id: 9, name: "Lola Sueldo", amount: 360000 }, { id: 10, name: "Lola Salud", amount: 51347 },
    { id: 11, name: "Falabella", amount: 0 }, { id: 12, name: "Davivienda", amount: 67000 },
    { id: 13, name: "Scotía", amount: 3000000 }, { id: 14, name: "Bancolombia", amount: 48490 },
  ],
  APTOS: [
    { id: 15, name: "Predial", amount: 616000 }, { id: 16, name: "Mini cubi", amount: 300000 },
    { id: 17, name: "Admon 201", amount: 477614 }, { id: 18, name: "Admon 915", amount: 802700 },
    { id: 19, name: "Tomas", amount: 1100000 },
  ],
};

const STATUS_MIGRATION = { "Pagado": "paid", "No pagado": "unpaid", "Programado": "scheduled", "Verificar": "verify" };

function migrateStatuses(allMonths) {
  const migrated = {};
  for (const [monthKey, categories] of Object.entries(allMonths)) {
    migrated[monthKey] = {};
    for (const [cat, expenses] of Object.entries(categories)) {
      migrated[monthKey][cat] = expenses.map((exp) => ({
        ...exp, status: STATUS_MIGRATION[exp.status] ?? exp.status,
      }));
    }
  }
  return migrated;
}

const freshMonth = () => {
  const d = {};
  Object.keys(DEFAULT_TEMPLATE).forEach((c) => {
    d[c] = DEFAULT_TEMPLATE[c].map((e) => ({ ...e, status: "unpaid" }));
  });
  return d;
};

function ExpenseTracker({ importedData }) {
  const { t, locale, currency, lang } = useI18n();
  const today = new Date();
  const [allMonths, setAllMonths] = useState({});
  const [viewDate, setViewDate] = useState(today);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [loaded, setLoaded] = useState(false);
  const drag = useRef({ fromCat: null, fromId: null });
  const [overInfo, setOverInfo] = useState({ cat: null, id: null });

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_EXPENSES);
        if (r && r.value) setAllMonths(migrateStatuses(JSON.parse(r.value)));
        else setAllMonths({ [toMonthKey(today)]: freshMonth() });
      } catch (e) { setAllMonths({ [toMonthKey(today)]: freshMonth() }); }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (importedData) setAllMonths(importedData); }, [importedData]);

  const saveData = useCallback(async (data) => {
    setSyncStatus("saving");
    try {
      await window.storage.set(STORAGE_EXPENSES, JSON.stringify(data));
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch (e) { setSyncStatus("error"); }
  }, []);

  useEffect(() => { if (loaded) saveData(allMonths); }, [allMonths, loaded]);

  const viewKey = toMonthKey(viewDate);
  const isCurrentMonth = viewKey === toMonthKey(today);
  const expenses = allMonths[viewKey] || null;

  const setExpenses = (u) => setAllMonths((p) => ({ ...p, [viewKey]: typeof u === "function" ? u(p[viewKey]) : u }));
  const goMonth = (dir) => { const d = new Date(viewDate); d.setDate(1); d.setMonth(d.getMonth() + dir); setViewDate(d); };
  const createCurrentMonth = () => { setAllMonths((p) => ({ ...p, [toMonthKey(today)]: freshMonth() })); setViewDate(new Date(today)); };
  const updateExpense = (cat, id, field, val) => setExpenses((p) => ({ ...p, [cat]: p[cat].map((e) => e.id === id ? { ...e, [field]: val } : e) }));
  const addExpense = (cat) => {
    const maxId = Math.max(...Object.values(expenses).flat().map((e) => e.id), 0);
    setExpenses((p) => ({ ...p, [cat]: [...p[cat], { id: maxId + 1, name: t("expense.defaultName"), amount: 0, status: "unpaid" }] }));
  };
  const deleteExpense = (cat, id) => setExpenses((p) => ({ ...p, [cat]: p[cat].filter((e) => e.id !== id) }));

  const onDragStart = (cat, id) => { drag.current = { fromCat: cat, fromId: id }; };
  const onDragOverRow = (e, toCat, toId) => {
    e.preventDefault();
    const { fromCat, fromId } = drag.current;
    if (!fromId || (overInfo.cat === toCat && overInfo.id === toId)) return;
    setOverInfo({ cat: toCat, id: toId });
    setExpenses((prev) => {
      const next = {};
      Object.keys(prev).forEach((c) => { next[c] = [...prev[c]]; });
      const fromList = next[fromCat];
      const fromIdx = fromList.findIndex((e) => e.id === fromId);
      if (fromIdx === -1) return prev;
      const [item] = fromList.splice(fromIdx, 1);
      const toList = next[toCat];
      const toIdx = toList.findIndex((e) => e.id === toId);
      toList.splice(toIdx === -1 ? toList.length : toIdx, 0, item);
      drag.current = { fromCat: toCat, fromId };
      return next;
    });
  };
  const onDragOverCat = (e, toCat) => {
    e.preventDefault();
    const { fromCat, fromId } = drag.current;
    if (!fromId || fromCat === toCat) return;
    setOverInfo({ cat: toCat, id: null });
    setExpenses((prev) => {
      const next = {};
      Object.keys(prev).forEach((c) => { next[c] = [...prev[c]]; });
      const fromList = next[fromCat];
      const fromIdx = fromList.findIndex((e) => e.id === fromId);
      if (fromIdx === -1) return prev;
      const [item] = fromList.splice(fromIdx, 1);
      next[toCat].push(item);
      drag.current = { fromCat: toCat, fromId };
      return next;
    });
  };
  const onDragEnd = () => { drag.current = { fromCat: null, fromId: null }; setOverInfo({ cat: null, id: null }); };

  const totals = () => {
    if (!expenses) return {};
    const all = Object.values(expenses).flat();
    return {
      total: all.reduce((s, e) => s + e.amount, 0),
      paid: all.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0),
      unpaid: all.filter((e) => e.status === "unpaid").reduce((s, e) => s + e.amount, 0),
      scheduled: all.filter((e) => e.status === "scheduled").reduce((s, e) => s + e.amount, 0),
      verify: all.filter((e) => e.status === "verify").reduce((s, e) => s + e.amount, 0),
    };
  };
  const tots = totals();
  const hasFuture = toMonthKey(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)) <= toMonthKey(today);

  if (!loaded) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <MonthNav viewDate={viewDate} onPrev={() => goMonth(-1)} onNext={() => goMonth(1)}
        hasFuture={hasFuture} syncStatus={syncStatus} isCurrentMonth={isCurrentMonth} lang={lang} />

      {!expenses && (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
          {isCurrentMonth
            ? <><p className="text-slate-500 dark:text-zinc-400 mb-4 text-sm">{t("empty.noDataMonth")}</p><Btn variant="primary" size="md" onClick={createCurrentMonth}>{t("btn.createMonth")}</Btn></>
            : <p className="text-slate-400 dark:text-zinc-500 text-sm">{t("empty.noSavedData")}</p>}
        </div>
      )}

      {expenses && (
        <>
          <div className="flex justify-end mb-3">
            {isCurrentMonth && <Btn onClick={createCurrentMonth}>{t("btn.resetMonth")}</Btn>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <StatCard label={t("summary.total")} value={fmt(tots.total, locale, currency)}
              colorClass="border-slate-200 dark:border-zinc-700" icon={<Wallet size={14} className="text-slate-400 dark:text-zinc-500" />} />
            <StatCard label={t("summary.paid")} value={fmt(tots.paid, locale, currency)}
              colorClass="border-emerald-200 dark:border-emerald-800/60" icon={<CheckCircle2 size={14} className="text-emerald-500" />} />
            <StatCard label={t("summary.unpaid")} value={fmt(tots.unpaid, locale, currency)}
              colorClass="border-rose-200 dark:border-rose-800/60" icon={<XCircle size={14} className="text-rose-500" />} />
            <StatCard label={t("summary.scheduled")} value={fmt(tots.scheduled, locale, currency)}
              colorClass="border-blue-200 dark:border-blue-800/60" icon={<Clock size={14} className="text-blue-500" />} />
            <StatCard label={t("summary.verify")} value={fmt(tots.verify, locale, currency)}
              colorClass="border-amber-200 dark:border-amber-800/60" icon={<AlertCircle size={14} className="text-amber-500" />} />
          </div>

          {Object.keys(expenses).map((cat, idx) => {
            const catTotal = expenses[cat].reduce((s, e) => s + e.amount, 0);
            const isDropTarget = overInfo.cat === cat;
            return (
              <motion.div key={cat} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}
                onDragOver={(e) => onDragOverCat(e, cat)} onDragEnd={onDragEnd}
                className={cn(
                  "bg-white dark:bg-zinc-900 border rounded-xl p-5 mb-4 transition-all",
                  isDropTarget ? "border-emerald-400 dark:border-emerald-500/50 shadow-sm shadow-emerald-100 dark:shadow-emerald-900/20" : "border-slate-200 dark:border-zinc-800"
                )}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-mono text-sm font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-widest">{cat}</h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 font-mono mt-0.5">{fmt(catTotal, locale, currency)}</p>
                  </div>
                  {isCurrentMonth && (
                    <Btn variant="primary" onClick={() => addExpense(cat)}>
                      <Plus size={14} /> {t("btn.add")}
                    </Btn>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800">
                        {isCurrentMonth && <th className="w-6 pb-2" />}
                        <th className="text-left pb-2 px-2 font-mono text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{t("col.expense")}</th>
                        <th className="text-right pb-2 px-2 font-mono text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{t("col.value")}</th>
                        <th className="text-center pb-2 px-2 font-mono text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{t("col.status")}</th>
                        {isCurrentMonth && <th className="w-8 pb-2" />}
                      </tr>
                    </thead>
                    <tbody>
                      {expenses[cat].map((exp) => {
                        const isDragging = drag.current.fromId === exp.id && drag.current.fromCat === cat;
                        const sc = STATUS_CFG[exp.status] || STATUS_CFG.unpaid;
                        return (
                          <tr key={exp.id} draggable={isCurrentMonth}
                            onDragStart={() => onDragStart(cat, exp.id)}
                            onDragOver={(e) => onDragOverRow(e, cat, exp.id)}
                            onDragEnd={onDragEnd}
                            className={cn(
                              "border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-all group",
                              isDragging && "opacity-30"
                            )}>
                            {isCurrentMonth && (
                              <td className="py-2.5 px-1 text-slate-300 dark:text-zinc-700 group-hover:text-slate-400 dark:group-hover:text-zinc-500 cursor-grab w-6">
                                <GripVertical size={14} />
                              </td>
                            )}
                            <td className="py-2.5 px-2">
                              {isCurrentMonth
                                ? <input type="text" value={exp.name} onChange={(e) => updateExpense(cat, exp.id, "name", e.target.value)}
                                    className="w-full bg-transparent border-0 outline-none text-slate-700 dark:text-zinc-200 focus:text-slate-900 dark:focus:text-zinc-100 rounded px-1 py-0.5 focus:bg-slate-100 dark:focus:bg-zinc-800/60 transition" />
                                : <span className="px-1 text-slate-700 dark:text-zinc-300">{exp.name}</span>}
                            </td>
                            <td className="py-2.5 px-2">
                              {isCurrentMonth
                                ? <AmountInput amount={exp.amount} onChange={(v) => updateExpense(cat, exp.id, "amount", v)} className="w-full text-right text-sm" />
                                : <span className="font-mono text-slate-700 dark:text-zinc-300 block text-right">{fmt(exp.amount, locale, currency)}</span>}
                            </td>
                            <td className="py-2.5 px-2">
                              {isCurrentMonth
                                ? <select value={exp.status} onChange={(e) => updateExpense(cat, exp.id, "status", e.target.value)}
                                    className={cn("w-full border rounded-lg px-2 py-1 text-xs font-medium bg-transparent cursor-pointer outline-none focus:ring-1 transition", sc.cls)}>
                                    <option value="unpaid" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">{t("status.unpaid")}</option>
                                    <option value="paid" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">{t("status.paid")}</option>
                                    <option value="scheduled" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">{t("status.scheduled")}</option>
                                    <option value="verify" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">{t("status.verify")}</option>
                                  </select>
                                : <span className={cn("inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-medium", sc.cls)}>
                                    {sc.icon} {t(`status.${exp.status}`)}
                                  </span>}
                            </td>
                            {isCurrentMonth && (
                              <td className="py-2.5 px-2 text-center">
                                <button onClick={() => deleteExpense(cat, exp.id)} className="text-slate-300 dark:text-zinc-700 hover:text-rose-500 dark:hover:text-rose-400 transition opacity-0 group-hover:opacity-100">
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {isCurrentMonth && expenses[cat].length === 0 && (
                        <tr><td colSpan={5} className="py-8 text-center text-slate-300 dark:text-zinc-600 text-xs">{t("state.dropHere")}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── FLUJO DE CAJA ────────────────────────────────────────────────────────────
const defaultFlujoMonth = () => ({
  entradas: [{ id: 1, concepto: "915", valor: 0 }, { id: 2, concepto: "Glori", valor: 0 }],
  salidas: [
    { id: 1, concepto: "Prediales", valor: 0 }, { id: 2, concepto: "Admon 915", valor: 0 },
    { id: 3, concepto: "Admon 201", valor: 0 }, { id: 4, concepto: "Tomas", valor: 0 },
  ],
  descuentos: [
    { id: 1, label: "Menos 201", valor: 0 },
    { id: 2, label: "Menos préstamo", valor: 0 },
    { id: 3, label: "Menos adelanto", valor: 0 },
  ],
  prestamos: {
    conceptos: [{ id: 1, nombre: "Cabina y otros", cantidad: 0 }, { id: 2, nombre: "Arreglo entrada", cantidad: 0 }],
    abonos: [],
  },
});

function FlujoCaja({ importedData }) {
  const { t, locale, currency, lang } = useI18n();
  const today = new Date();
  const [allMonths, setAllMonths] = useState({});
  const [viewDate, setViewDate] = useState(today);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_FLUJO);
        if (r && r.value) {
          const parsed = JSON.parse(r.value);
          Object.keys(parsed).forEach((key) => {
            const d = parsed[key].descuentos;
            if (d && !Array.isArray(d)) {
              parsed[key].descuentos = [
                { id: 1, label: "Menos 201", valor: d.d201 || 0 },
                { id: 2, label: "Menos préstamo", valor: d.prestamo || 0 },
                { id: 3, label: "Menos adelanto", valor: d.adelanto || 0 },
              ];
            }
          });
          setAllMonths(parsed);
        } else {
          setAllMonths({ [toMonthKey(today)]: defaultFlujoMonth() });
        }
      } catch (e) { setAllMonths({ [toMonthKey(today)]: defaultFlujoMonth() }); }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (importedData) setAllMonths(importedData); }, [importedData]);

  const saveData = useCallback(async (data) => {
    setSyncStatus("saving");
    try {
      await window.storage.set(STORAGE_FLUJO, JSON.stringify(data));
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch (e) { setSyncStatus("error"); }
  }, []);

  useEffect(() => { if (loaded) saveData(allMonths); }, [allMonths, loaded]);

  const viewKey = toMonthKey(viewDate);
  const isCurrentMonth = viewKey === toMonthKey(today);
  const data = allMonths[viewKey] || null;
  const setData = (u) => setAllMonths((p) => ({ ...p, [viewKey]: typeof u === "function" ? u(p[viewKey]) : u }));
  const goMonth = (dir) => { const d = new Date(viewDate); d.setDate(1); d.setMonth(d.getMonth() + dir); setViewDate(d); };
  const createMonth = () => { setAllMonths((p) => ({ ...p, [toMonthKey(today)]: defaultFlujoMonth() })); setViewDate(new Date(today)); };
  const hasFuture = toMonthKey(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)) <= toMonthKey(today);

  const calc = (d) => {
    if (!d) return {};
    const totalEntradas = d.entradas.reduce((s, e) => s + e.valor, 0);
    const totalSalidas = d.salidas.reduce((s, e) => s + e.valor, 0);
    const neto = totalEntradas - totalSalidas;
    const cu = neto / 2;
    const descRows = Array.isArray(d.descuentos) ? d.descuentos : [];
    let acc = cu;
    const descAcum = descRows.map((desc) => { acc = acc - (desc.valor || 0); return acc; });
    const totalPrestamos = d.prestamos.conceptos.reduce((s, p) => s + p.cantidad, 0);
    const totalAbonos = d.prestamos.abonos.reduce((s, a) => s + a.valor, 0);
    return { totalEntradas, totalSalidas, neto, cu, descAcum, total: acc, totalPrestamos, totalAbonos, restante: totalPrestamos - totalAbonos };
  };

  const c = data ? calc(data) : {};
  const ro = !isCurrentMonth;
  const [copyStatus, setCopyStatus] = useState("idle");

  const handleCapture = async () => {
    if (!data) return;
    setCopyStatus("copying");
    try {
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const cc = calc(data);
      const tdS = "border:1px solid #e2e8f0;padding:8px 12px;font-size:13px;";
      const tdRS = tdS + "text-align:right;font-weight:500;font-family:monospace;";
      const tdLS = tdS + "color:#334155;";
      const thGreenS = tdS + "font-weight:700;text-align:center;background:#d1fae5;color:#065f46;";
      const thRedS = tdS + "font-weight:700;text-align:center;background:#fee2e2;color:#991b1b;";
      const green10 = "background:#f0fdf4;";
      const red10 = "background:#fff5f5;";
      const fmtR = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);
      const entSalRows = Array.from({ length: Math.max(data.entradas.length, data.salidas.length) }).map((_, i) => {
        const ent = data.entradas[i]; const sal = data.salidas[i];
        return `<tr><td style="${tdLS}">${ent ? ent.concepto : ""}</td><td style="${tdRS}">${ent ? fmtR(ent.valor) : ""}</td><td style="${tdRS}${red10}">${sal ? fmtR(sal.valor) : ""}</td><td style="${tdLS}${red10}">${sal ? sal.concepto : ""}</td></tr>`;
      }).join("");
      const descRowsHtml = (data.descuentos || []).map((desc, i) => `<tr style="${green10}"><td style="${tdLS}font-weight:600;">${desc.label}</td><td style="${tdRS}">${fmtR(cc.descAcum && cc.descAcum[i])}</td><td style="${tdRS}${red10}">${fmtR(desc.valor)}</td><td style="${tdLS}${red10}">${desc.label.replace(/^Menos\s*/i, "")}</td></tr>`).join("");
      const maxRows = Math.max(data.prestamos.conceptos.length, data.prestamos.abonos.length);
      const prestRows = Array.from({ length: maxRows }).map((_, i) => {
        const p = data.prestamos.conceptos[i]; const a = data.prestamos.abonos[i];
        return `<tr><td style="${tdLS}">${p ? p.nombre : ""}</td><td style="${tdRS}">${p ? fmtR(p.cantidad) : ""}</td><td style="${tdRS}">${a ? fmtR(a.valor) : ""}</td><td style="${tdLS}">${a ? a.fecha : ""}</td></tr>`;
      }).join("");
      const html = `<div style="font-family:sans-serif;background:#f8fafc;padding:24px;display:inline-block;color:#1e293b;">
        <table style="border-collapse:collapse;width:700px;margin-bottom:24px;">
          <thead><tr><th style="${thGreenS}width:25%">CONCEPTO</th><th style="${thGreenS}width:25%">ENTRADA</th><th style="${thRedS}width:25%">SALIDA</th><th style="${thRedS}width:25%">CONCEPTO</th></tr></thead>
          <tbody>${entSalRows}
            <tr style="background:#f1f5f9;font-weight:700;"><td style="${tdLS}font-weight:700;">TOTAL</td><td style="${tdRS}">${fmtR(cc.totalEntradas)}</td><td style="${tdRS}${red10}">${fmtR(cc.totalSalidas)}</td><td style="${tdLS}${red10}"></td></tr>
            <tr style="${green10}"><td style="${tdLS}font-weight:600;">NETO</td><td style="${tdRS}">${fmtR(cc.neto)}</td><td style="${tdRS}${red10}"></td><td style="${tdLS}${red10}"></td></tr>
            <tr style="${green10}"><td style="${tdLS}font-weight:600;">C/U</td><td style="${tdRS}">${fmtR(cc.cu)}</td><td style="${tdRS}${red10}"></td><td style="${tdLS}${red10}"></td></tr>
            ${descRowsHtml}
            <tr style="background:#bbf7d0;font-weight:700;"><td style="${tdLS}font-weight:700;">TOTAL</td><td style="${tdRS}">${fmtR(cc.total)}</td><td style="${tdRS}${red10}"></td><td style="${tdLS}${red10}"></td></tr>
          </tbody>
        </table>
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#065f46;letter-spacing:0.1em;">PRÉSTAMOS</div>
        <table style="border-collapse:collapse;width:700px;">
          <thead><tr><th style="${thGreenS}width:30%">CONCEPTO</th><th style="${thGreenS}width:25%">CANTIDAD</th><th style="${thGreenS}width:25%">PAGADO</th><th style="${thGreenS}width:20%">FECHA</th></tr></thead>
          <tbody>${prestRows}
            <tr style="background:#f1f5f9;font-weight:700;"><td style="${tdLS}font-weight:700;">TOTALES</td><td style="${tdRS}">${fmtR(cc.totalPrestamos)}</td><td style="${tdRS}">${fmtR(cc.totalAbonos)}</td><td style="${tdLS}"></td></tr>
            <tr style="background:#fefce8;font-weight:700;"><td style="${tdLS}font-weight:700;">RESTANTE</td><td style="${tdRS}">${fmtR(cc.restante)}</td><td style="${tdRS}"></td><td style="${tdLS}"></td></tr>
          </tbody>
        </table>
      </div>`;
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
      container.innerHTML = html;
      document.body.appendChild(container);
      const canvas = await window.html2canvas(container.firstElementChild, { backgroundColor: "#f8fafc", scale: 2, useCORS: true });
      document.body.removeChild(container);
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setCopyStatus("copied"); setTimeout(() => setCopyStatus("idle"), 2500);
        } catch (e) {
          const reader = new FileReader();
          reader.onload = () => { const a = document.createElement("a"); a.href = reader.result; a.download = "flujo-caja.png"; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
          reader.readAsDataURL(blob); setCopyStatus("idle");
        }
      }, "image/png");
    } catch (e) { console.error(e); setCopyStatus("idle"); }
  };

  // Table cell shared classes
  const tdBase = "border border-slate-200 dark:border-zinc-800 px-3 py-2.5 font-mono text-sm text-slate-700 dark:text-zinc-300";
  const tdR = tdBase + " text-right font-mono tabular-nums";
  const thGreen = "border border-slate-200 dark:border-zinc-800 px-3 py-2 font-mono text-xs font-bold text-center uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400";
  const thRed = "border border-slate-200 dark:border-zinc-800 px-3 py-2 font-mono text-xs font-bold text-center uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400";
  const inputCls = "w-full text-right font-mono border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:outline-none bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 tabular-nums";

  if (!loaded) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <MonthNav viewDate={viewDate} onPrev={() => goMonth(-1)} onNext={() => goMonth(1)}
        hasFuture={hasFuture} syncStatus={syncStatus} isCurrentMonth={isCurrentMonth} lang={lang} />

      {!data && (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
          {isCurrentMonth
            ? <><p className="text-slate-500 dark:text-zinc-400 mb-4 text-sm">{t("empty.noDataMonth")}</p><Btn variant="primary" size="md" onClick={createMonth}>{t("btn.createMonth")}</Btn></>
            : <p className="text-slate-400 dark:text-zinc-500 text-sm">{t("empty.noSavedData")}</p>}
        </div>
      )}

      {data && (
        <div className="space-y-5">
          {/* Main flow table */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-mono text-sm font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-widest">{t("flujo.title")}</h3>
              </div>
              <div className="flex gap-2">
                <Btn onClick={handleCapture} variant={copyStatus === "copied" ? "primary" : "default"}>
                  <Camera size={14} />
                  {copyStatus === "copying" ? t("btn.generating") : copyStatus === "copied" ? t("btn.copied") : t("btn.capture")}
                </Btn>
                {isCurrentMonth && <Btn onClick={createMonth}>{t("btn.resetMonth")}</Btn>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thGreen}>{t("col.concept")}</th>
                    <th className={thGreen}>{t("col.entrada")}</th>
                    <th className={thRed}>{t("col.salida")}</th>
                    <th className={thRed}>{t("col.concept")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(data.entradas.length, data.salidas.length) }).map((_, i) => {
                    const ent = data.entradas[i]; const sal = data.salidas[i];
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className={cn(tdBase, "bg-emerald-50/50 dark:bg-emerald-950/10")}>
                          {ent && (!ro
                            ? <div className="flex items-center gap-1">
                                <input className={inputCls + " text-left"} value={ent.concepto}
                                  onChange={(e) => setData((p) => ({ ...p, entradas: p.entradas.map((x, j) => j === i ? { ...x, concepto: e.target.value } : x) }))} />
                                <button onClick={() => setData((p) => ({ ...p, entradas: p.entradas.filter((_, j) => j !== i) }))} className="text-slate-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 transition"><Trash2 size={13} /></button>
                              </div>
                            : <span className="px-1">{ent.concepto}</span>)}
                        </td>
                        <td className={cn(tdR, "bg-emerald-50/50 dark:bg-emerald-950/10")}>
                          {ent && (!ro
                            ? <AmountInput amount={ent.valor} onChange={(v) => setData((p) => ({ ...p, entradas: p.entradas.map((x, j) => j === i ? { ...x, valor: v } : x) }))} className="w-full text-right text-sm" />
                            : fmt(ent.valor, locale, currency))}
                        </td>
                        <td className={cn(tdR, "bg-rose-50/50 dark:bg-rose-950/10")}>
                          {sal && (!ro
                            ? <AmountInput amount={sal.valor} onChange={(v) => setData((p) => ({ ...p, salidas: p.salidas.map((x, j) => j === i ? { ...x, valor: v } : x) }))} className="w-full text-right text-sm" />
                            : fmt(sal.valor, locale, currency))}
                        </td>
                        <td className={cn(tdBase, "bg-rose-50/50 dark:bg-rose-950/10")}>
                          {sal && (!ro
                            ? <div className="flex items-center gap-1">
                                <input className={inputCls + " text-left"} value={sal.concepto}
                                  onChange={(e) => setData((p) => ({ ...p, salidas: p.salidas.map((x, j) => j === i ? { ...x, concepto: e.target.value } : x) }))} />
                                <button onClick={() => setData((p) => ({ ...p, salidas: p.salidas.filter((_, j) => j !== i) }))} className="text-slate-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 transition"><Trash2 size={13} /></button>
                              </div>
                            : sal.concepto)}
                        </td>
                      </tr>
                    );
                  })}

                  {!ro && (
                    <tr>
                      <td colSpan={2} className="border border-slate-200 dark:border-zinc-800 px-2 py-1.5 bg-emerald-50/30 dark:bg-emerald-950/5">
                        <button onClick={() => setData((p) => ({ ...p, entradas: [...p.entradas, { id: Date.now(), concepto: "", valor: 0 }] }))} className="text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition">
                          <Plus size={11} /> {t("btn.addEntrada")}
                        </button>
                      </td>
                      <td colSpan={2} className="border border-slate-200 dark:border-zinc-800 px-2 py-1.5 bg-rose-50/30 dark:bg-rose-950/5">
                        <button onClick={() => setData((p) => ({ ...p, salidas: [...p.salidas, { id: Date.now(), concepto: "", valor: 0 }] }))} className="text-xs text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 flex items-center gap-1 transition">
                          <Plus size={11} /> {t("btn.addSalida")}
                        </button>
                      </td>
                    </tr>
                  )}

                  <tr className="bg-slate-100 dark:bg-zinc-800 font-semibold">
                    <td className={tdBase}>{t("flujo.total")}</td>
                    <td className={cn(tdR, "text-emerald-700 dark:text-emerald-400")}>{fmt(c.totalEntradas, locale, currency)}</td>
                    <td className={cn(tdR, "text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/10")}>{fmt(c.totalSalidas, locale, currency)}</td>
                    <td className={cn(tdBase, "bg-rose-50/50 dark:bg-rose-950/10")} />
                  </tr>

                  {[{ key: "flujo.neto", val: c.neto }, { key: "flujo.cu", val: c.cu }].map(({ key, val }) => (
                    <tr key={key} className="bg-emerald-50 dark:bg-emerald-950/20">
                      <td className={cn(tdBase, "font-semibold text-emerald-700 dark:text-emerald-300")}>{t(key)}</td>
                      <td className={cn(tdR, "text-emerald-700 dark:text-emerald-300")}>{fmt(val, locale, currency)}</td>
                      <td className={cn(tdR, "bg-rose-50/50 dark:bg-rose-950/10")} />
                      <td className={cn(tdBase, "bg-rose-50/50 dark:bg-rose-950/10")} />
                    </tr>
                  ))}

                  {(data.descuentos || []).map((desc, i) => (
                    <tr key={desc.id} className="bg-emerald-50/70 dark:bg-emerald-950/10">
                      <td className={cn(tdBase, "font-semibold")}>
                        {!ro
                          ? <input className={inputCls + " text-left"} value={desc.label}
                              onChange={(e) => setData((p) => ({ ...p, descuentos: p.descuentos.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))} />
                          : desc.label}
                      </td>
                      <td className={cn(tdR, "text-emerald-700 dark:text-emerald-300")}>{fmt(c.descAcum && c.descAcum[i], locale, currency)}</td>
                      <td className={cn(tdR, "bg-rose-50/50 dark:bg-rose-950/10 text-rose-700 dark:text-rose-300")}>
                        {!ro
                          ? <AmountInput amount={desc.valor} onChange={(v) => setData((p) => ({ ...p, descuentos: p.descuentos.map((x, j) => j === i ? { ...x, valor: v } : x) }))} className="w-full text-right text-sm" />
                          : fmt(desc.valor, locale, currency)}
                      </td>
                      <td className={cn(tdBase, "bg-rose-50/50 dark:bg-rose-950/10")}>
                        <div className="flex items-center gap-1">
                          <input className={inputCls + " text-left flex-1"}
                            value={desc.label.replace(/^Menos\s*/i, "")}
                            onChange={(e) => setData((p) => ({ ...p, descuentos: p.descuentos.map((x, j) => j === i ? { ...x, label: "Menos " + e.target.value } : x) }))}
                            readOnly={ro} />
                          {!ro && <button onClick={() => setData((p) => ({ ...p, descuentos: p.descuentos.filter((_, j) => j !== i) }))} className="text-slate-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 transition"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!ro && (
                    <tr>
                      <td colSpan={4} className="border border-slate-200 dark:border-zinc-800 px-2 py-1.5">
                        <button onClick={() => setData((p) => ({ ...p, descuentos: [...(p.descuentos || []), { id: Date.now(), label: "Menos ...", valor: 0 }] }))} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition">
                          <Plus size={11} /> {t("btn.addDescuento")}
                        </button>
                      </td>
                    </tr>
                  )}

                  <tr className="bg-emerald-100 dark:bg-emerald-900/40 font-bold">
                    <td className={cn(tdBase, "text-emerald-800 dark:text-emerald-300 font-bold")}>{t("flujo.total")}</td>
                    <td className={cn(tdR, "text-emerald-800 dark:text-emerald-300")}>{fmt(c.total, locale, currency)}</td>
                    <td className={cn(tdR, "bg-rose-50/50 dark:bg-rose-950/10")} />
                    <td className={cn(tdBase, "bg-rose-50/50 dark:bg-rose-950/10")} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Loans table */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5">
            <h3 className="font-mono text-sm font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-widest mb-4">{t("flujo.loans")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thGreen}>{t("col.concept")}</th>
                    <th className={thGreen}>{t("col.cantidad")}</th>
                    <th className={thGreen}>{t("col.pagado")}</th>
                    <th className={thGreen}>{t("col.fecha")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(data.prestamos.conceptos.length, data.prestamos.abonos.length) }).map((_, i) => {
                    const p = data.prestamos.conceptos[i]; const a = data.prestamos.abonos[i];
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className={tdBase}>
                          {p && (!ro
                            ? <div className="flex items-center gap-1">
                                <input className={inputCls + " text-left flex-1"} value={p.nombre}
                                  onChange={(e) => setData((d) => ({ ...d, prestamos: { ...d.prestamos, conceptos: d.prestamos.conceptos.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x) } }))} />
                                <button onClick={() => setData((d) => ({ ...d, prestamos: { ...d.prestamos, conceptos: d.prestamos.conceptos.filter((_, j) => j !== i) } }))} className="text-slate-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 transition"><Trash2 size={13} /></button>
                              </div>
                            : p.nombre)}
                        </td>
                        <td className={tdR}>
                          {p && (!ro
                            ? <AmountInput amount={p.cantidad} onChange={(v) => setData((d) => ({ ...d, prestamos: { ...d.prestamos, conceptos: d.prestamos.conceptos.map((x, j) => j === i ? { ...x, cantidad: v } : x) } }))} className="w-full text-right text-sm" />
                            : fmt(p.cantidad, locale, currency))}
                        </td>
                        <td className={tdR}>
                          {a && (!ro
                            ? <AmountInput amount={a.valor} onChange={(v) => setData((d) => ({ ...d, prestamos: { ...d.prestamos, abonos: d.prestamos.abonos.map((x, j) => j === i ? { ...x, valor: v } : x) } }))} className="w-full text-right text-sm" />
                            : fmt(a.valor, locale, currency))}
                        </td>
                        <td className={tdBase}>
                          {a && (
                            <div className="flex items-center gap-1">
                              {!ro
                                ? <input type="date" className="border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-emerald-500/50 dark:[color-scheme:dark]" value={a.fecha}
                                    onChange={(e) => setData((d) => ({ ...d, prestamos: { ...d.prestamos, abonos: d.prestamos.abonos.map((x, j) => j === i ? { ...x, fecha: e.target.value } : x) } }))} />
                                : a.fecha}
                              {!ro && <button onClick={() => setData((d) => ({ ...d, prestamos: { ...d.prestamos, abonos: d.prestamos.abonos.filter((_, j) => j !== i) } }))} className="text-slate-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 transition"><Trash2 size={13} /></button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {!ro && (
                    <tr>
                      <td colSpan={2} className="border border-slate-200 dark:border-zinc-800 px-2 py-1.5">
                        <button onClick={() => setData((d) => ({ ...d, prestamos: { ...d.prestamos, conceptos: [...d.prestamos.conceptos, { id: Date.now(), nombre: "", cantidad: 0 }] } }))} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition">
                          <Plus size={11} /> {t("btn.addPrestamo")}
                        </button>
                      </td>
                      <td colSpan={2} className="border border-slate-200 dark:border-zinc-800 px-2 py-1.5">
                        <button onClick={() => setData((d) => ({ ...d, prestamos: { ...d.prestamos, abonos: [...d.prestamos.abonos, { id: Date.now(), valor: 0, fecha: new Date().toISOString().split("T")[0] }] } }))} className="text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition">
                          <Plus size={11} /> {t("btn.addAbono")}
                        </button>
                      </td>
                    </tr>
                  )}

                  <tr className="bg-slate-100 dark:bg-zinc-800 font-semibold">
                    <td className={tdBase}>{t("flujo.totales")}</td>
                    <td className={tdR}>{fmt(c.totalPrestamos, locale, currency)}</td>
                    <td className={tdR}>{fmt(c.totalAbonos, locale, currency)}</td>
                    <td className={tdBase} />
                  </tr>
                  <tr className="bg-amber-50 dark:bg-amber-950/20 font-semibold">
                    <td className={cn(tdBase, "text-amber-700 dark:text-amber-400")}>{t("flujo.restante")}</td>
                    <td className={cn(tdR, "text-amber-700 dark:text-amber-400")}>{fmt(c.restante, locale, currency)}</td>
                    <td className={tdR} />
                    <td className={tdBase} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MONTH/YEAR PICKER ────────────────────────────────────────────────────────
function MonthYearPicker({ pos, dropRef, viewDate, onSelect }) {
  const { lang } = useI18n();
  const today = new Date();
  const [year, setYear] = useState(viewDate.getFullYear());

  const todayKey = toMonthKey(today);
  const selectedKey = toMonthKey(viewDate);

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", { month: "short" })
      .format(new Date(year, i, 1)).toUpperCase()
  );

  return (
    <div ref={dropRef} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl w-52 overflow-hidden font-mono">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-zinc-800">
        <button onClick={() => setYear((y) => y - 1)}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 transition">
          <ChevronLeft size={13} />
        </button>
        <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 tracking-widest">{year}</span>
        <button onClick={() => setYear((y) => y + 1)} disabled={year >= today.getFullYear()}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 transition disabled:opacity-20 disabled:cursor-not-allowed">
          <ChevronRight size={13} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1 p-2">
        {monthNames.map((name, i) => {
          const key = `${year}-${String(i + 1).padStart(2, "0")}`;
          const isSelected = key === selectedKey;
          const isFuture = key > todayKey;
          return (
            <button key={i} disabled={isFuture}
              onMouseDown={(e) => { e.stopPropagation(); onSelect(new Date(year, i, 1)); }}
              className={cn(
                "py-1.5 rounded text-[10px] font-medium transition-colors tracking-wider",
                isSelected ? "bg-emerald-600 text-white font-bold"
                : isFuture ? "text-slate-300 dark:text-zinc-700 cursor-not-allowed"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100",
                key === todayKey && !isSelected && "ring-1 ring-emerald-400/50"
              )}>
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── LEDGER ───────────────────────────────────────────────────────────────────
const CAT_COLORS = { FIJOS: "#34d399", TARJETAS: "#60a5fa", APTOS: "#fbbf24" };

const STATUS_ICON = {
  paid:      { ch: "✓", cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30" },
  unpaid:    { ch: "×", cls: "text-rose-400 bg-rose-500/10 border border-rose-500/30" },
  scheduled: { ch: "◷", cls: "text-blue-400 bg-blue-500/10 border border-blue-500/30" },
  verify:    { ch: "!", cls: "text-amber-400 bg-amber-500/10 border border-amber-500/30" },
};

const AMOUNT_CLS = {
  paid:      "text-emerald-600 dark:text-emerald-400",
  unpaid:    "text-rose-600 dark:text-rose-400",
  scheduled: "text-blue-600 dark:text-blue-400",
  verify:    "text-amber-600 dark:text-amber-400",
};

function StatusPicker({ status, onChange }) {
  const { t } = useI18n();
  const [pos, setPos] = useState(null);
  const btnRef = useRef();
  const dropRef = useRef();

  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inBtn = btnRef.current?.contains(e.target);
      const inDrop = dropRef.current?.contains(e.target);
      if (!inBtn && !inDrop) setPos(null);
    };
    document.addEventListener("mousedown", handler);
    const onScroll = () => setPos(null);
    window.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("mousedown", handler); window.removeEventListener("scroll", onScroll, true); };
  }, [open]);

  const handleOpen = (e) => {
    e.stopPropagation();
    if (open) { setPos(null); return; }
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const si = STATUS_ICON[status] || STATUS_ICON.unpaid;

  return (
    <div className="flex items-center justify-center">
      <button ref={btnRef} onClick={handleOpen}
        className={cn("inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold hover:opacity-75 transition-opacity", si.cls)}
      >
        {si.ch}
      </button>
      {open && pos && (
        <div ref={dropRef} style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl py-0.5 min-w-[110px]">
          {Object.entries(STATUS_ICON).map(([s, cfg]) => (
            <button key={s}
              onMouseDown={(e) => { e.stopPropagation(); onChange(s); setPos(null); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left",
                s === status ? "opacity-100" : "opacity-60 hover:opacity-100"
              )}
            >
              <span className={cn("inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold shrink-0", cfg.cls)}>{cfg.ch}</span>
              <span className="text-slate-700 dark:text-zinc-200 font-mono">{t(`status.${s}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Ledger() {
  const { t, locale, currency, lang } = useI18n();
  const today = new Date();
  const [allMonths, setAllMonths] = useState({});
  const [viewDate, setViewDate] = useState(today);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(null); // { cat, id, name, amount }
  const [pickerPos, setPickerPos] = useState(null);
  const brandRef = useRef();
  const pickerDropRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_EXPENSES);
        if (r && r.value) setAllMonths(migrateStatuses(JSON.parse(r.value)));
        else setAllMonths({});
      } catch (e) { setAllMonths({}); }
      setLoaded(true);
    })();
  }, []);

  const saveData = useCallback(async (data) => {
    try { await window.storage.set(STORAGE_EXPENSES, JSON.stringify(data)); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { if (loaded) saveData(allMonths); }, [allMonths, loaded]);

  useEffect(() => {
    if (!pickerPos) return;
    const handler = (e) => {
      if (!brandRef.current?.contains(e.target) && !pickerDropRef.current?.contains(e.target)) setPickerPos(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerPos]);

  const openPicker = (e) => {
    e.stopPropagation();
    if (pickerPos) { setPickerPos(null); return; }
    const r = brandRef.current.getBoundingClientRect();
    setPickerPos({ top: r.bottom + 6, left: r.left });
  };

  const viewKey = toMonthKey(viewDate);
  const isCurrentMonth = viewKey === toMonthKey(today);
  const expenses = allMonths[viewKey] || null;

  const createCurrentMonth = () => { setAllMonths((p) => ({ ...p, [toMonthKey(today)]: freshMonth() })); setViewDate(new Date(today)); };

  const updateExpense = (cat, id, patch) => {
    setAllMonths((p) => ({
      ...p,
      [viewKey]: { ...p[viewKey], [cat]: p[viewKey][cat].map((e) => e.id === id ? { ...e, ...patch } : e) },
    }));
  };

  const saveEditing = () => {
    if (!editing) return;
    updateExpense(editing.cat, editing.id, { name: editing.name, amount: editing.amount });
    setEditing(null);
  };

  const all = expenses ? Object.values(expenses).flat() : [];
  const grandTotal = all.reduce((s, e) => s + e.amount, 0);
  const paidTotal = all.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);
  const pending = grandTotal - paidTotal;

  if (!loaded) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ fontVariantNumeric: "tabular-nums" }}>
      {!expenses && (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
          <button ref={brandRef} onClick={openPicker}
            className="flex items-center gap-1 text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer select-none mx-auto mb-4">
            {fmtMonth(viewDate, lang === "en" ? "en-US" : "es-ES")}
            <ChevronDown size={10} className={cn("transition-transform", pickerPos && "rotate-180")} />
          </button>
          {isCurrentMonth
            ? <><p className="text-slate-500 dark:text-zinc-400 mb-4 text-sm">{t("empty.noDataMonth")}</p><Btn variant="primary" size="md" onClick={createCurrentMonth}>{t("btn.createMonth")}</Btn></>
            : <p className="text-slate-400 dark:text-zinc-500 text-sm">{t("empty.noSavedData")}</p>}
        </div>
      )}

      {expenses && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-end">
            <div>
              <button ref={brandRef} onClick={openPicker}
                className="flex items-center gap-1 text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer select-none group">
                {fmtMonth(viewDate, lang === "en" ? "en-US" : "es-ES")}
                <ChevronDown size={10} className={cn("transition-transform", pickerPos && "rotate-180")} />
              </button>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-lg font-bold text-slate-900 dark:text-zinc-50 font-mono tracking-tight">{t("ledger.title")}</div>
                {!isCurrentMonth && (
                  <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700 px-1.5 py-0.5 rounded-full font-mono">
                    {t("state.readonly")}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-400 dark:text-zinc-500 leading-relaxed">
              <div>{t("summary.total")} · <span className="text-slate-900 dark:text-zinc-100 font-semibold">{fmt(grandTotal, locale, currency)}</span></div>
              <div>
                {t("summary.paid")} · <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(paidTotal, locale, currency)}</span>
                {" "}&nbsp;{t("ledger.pending")} · <span className="text-rose-600 dark:text-rose-400 font-semibold">{fmt(pending, locale, currency)}</span>
              </div>
              <div className="text-[10px] text-slate-300 dark:text-zinc-600 mt-0.5">{all.length} {t("ledger.transactions")} · 3 {t("ledger.categories")}</div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800">
                  <th className="w-8 py-2 px-3" />
                  <th className="text-left py-2 px-3 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-medium">{t("col.expense")}</th>
                  <th className="text-right py-2 px-3 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-medium w-36">{t("col.value")}</th>
                  <th className="text-center py-2 px-3 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-medium w-16">{t("col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(expenses).map(([cat, items]) => {
                  const catTotal = items.reduce((s, e) => s + e.amount, 0);
                  return (
                    <Fragment key={cat}>
                      <tr className="border-t-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/40">
                        <td className="py-2.5 px-3">
                          <span style={{ color: CAT_COLORS[cat] || "#71717a" }} className="text-[10px]">■</span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-zinc-100 tracking-widest uppercase">{cat}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500 dark:text-zinc-400">{fmt(catTotal, locale, currency)}</td>
                        <td className="py-2.5 px-3 text-center text-slate-400 dark:text-zinc-600 text-[10px]">{items.length} items</td>
                      </tr>
                      {items.map((e, i) => (
                        <tr key={e.id}
                          onClick={isCurrentMonth ? () => setEditing({ cat, id: e.id, name: e.name, amount: e.amount }) : undefined}
                          className={cn(
                            "border-b border-dashed border-slate-100 dark:border-zinc-800/60 transition-colors",
                            i % 2 === 1 ? "bg-slate-50/50 dark:bg-zinc-900/40" : "",
                            isCurrentMonth && "hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 cursor-pointer"
                          )}>
                          <td className="py-1.5 px-3 w-8" />
                          <td className="py-1.5 px-3 text-slate-700 dark:text-zinc-300">{e.name}</td>
                          <td className={cn("py-1.5 px-3 text-right font-semibold", AMOUNT_CLS[e.status] || "text-slate-700 dark:text-zinc-300")}>
                            {fmt(e.amount, locale, currency)}
                          </td>
                          <td className="py-1.5 px-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                            {isCurrentMonth
                              ? <StatusPicker status={e.status} onChange={(v) => updateExpense(cat, e.id, { status: v })} />
                              : <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold mx-auto", (STATUS_ICON[e.status] || STATUS_ICON.unpaid).cls)}>
                                  {(STATUS_ICON[e.status] || STATUS_ICON.unpaid).ch}
                                </span>}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t-2 border-slate-200 dark:border-zinc-700 grid grid-cols-4 gap-4 items-baseline bg-slate-50 dark:bg-zinc-900/50 font-mono">
            <div>
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{t("ledger.finalBalance")}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">{t("summary.paid")}</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmt(paidTotal, locale, currency)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">{t("ledger.pending")}</div>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400">{fmt(pending, locale, currency)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">{t("summary.total")}</div>
              <div className="text-base font-bold text-slate-900 dark:text-zinc-100">{fmt(grandTotal, locale, currency)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Month/year picker */}
      {pickerPos && (
        <MonthYearPicker pos={pickerPos} dropRef={pickerDropRef} viewDate={viewDate}
          onSelect={(d) => { setViewDate(d); setPickerPos(null); }} />
      )}

      {/* Edit expense modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)}
        title={t("ledger.editTitle")}
        actions={<>
          <Btn onClick={() => setEditing(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={saveEditing}>{t("btn.save")}</Btn>
        </>}
      >
        {editing && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.expense")}</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                autoFocus
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.value")}</label>
              <input
                type="number"
                value={editing.amount}
                onChange={(e) => setEditing((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── SPLITTER ─────────────────────────────────────────────────────────────────
const STORAGE_SPLITTER_PEOPLE = "splitter-people";
const SPLITTER_COLORS = ["#10b981", "#8b5cf6", "#f59e0b", "#3b82f6", "#f43f5e", "#06b6d4"];

function StatBadge({ label, value, color, big, locale, currency }) {
  return (
    <div className="text-right">
      <div className="text-[9px] font-mono font-semibold tracking-widest uppercase text-slate-400 dark:text-zinc-600">{label}</div>
      <div className="font-mono font-semibold mt-0.5" style={{ fontSize: big ? 20 : 13, color }}>{fmt(value, locale, currency)}</div>
    </div>
  );
}

function SplitterAmountInput({ value, onChange, locale, currency }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  return editing ? (
    <input
      type="number"
      value={raw}
      autoFocus
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => { onChange(parseFloat(raw) || 0); setEditing(false); }}
      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
      className="w-24 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-slate-800 dark:text-zinc-100 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50 text-right font-mono"
    />
  ) : (
    <input
      readOnly
      value={value === 0 ? "" : fmt(value, locale, currency)}
      onFocus={() => { setRaw(value === 0 ? "" : String(value)); setEditing(true); }}
      placeholder="0"
      className="w-24 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-slate-800 dark:text-zinc-100 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50 text-right font-mono cursor-text"
    />
  );
}

function SplitterColumn({ title, total, color, rows, labelKey, valueKey, onUpd, onRm, onAdd, locale, currency, t }) {
  return (
    <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color }}>{title}</span>
        <span className="font-mono text-xs font-semibold" style={{ color }}>{fmt(total, locale, currency)}</span>
      </div>
      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input
              value={r[labelKey]}
              onChange={(e) => onUpd(i, labelKey, e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-slate-800 dark:text-zinc-100 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50 min-w-0"
            />
            <SplitterAmountInput
              value={r[valueKey]}
              onChange={(v) => onUpd(i, valueKey, v)}
              locale={locale}
              currency={currency}
            />
            <button onClick={() => onRm(i)} className="text-slate-300 dark:text-zinc-600 hover:text-rose-500 transition p-1">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button onClick={onAdd} className="mt-1 border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 text-xs py-1.5 px-2 transition flex items-center gap-1 justify-center">
          <Plus size={11} /> {t("splitter.addRow")}
        </button>
      </div>
    </div>
  );
}

function Splitter() {
  const { t, locale, currency, lang } = useI18n();
  const today = new Date();
  const monthKey = toMonthKey(today);

  const [entradas, setEntradas] = useState([]);
  const [salidas, setSalidas] = useState([]);
  const [descuentos, setDescuentos] = useState([]);
  const [people, setPeople] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_FLUJO);
        if (res?.value) {
          const allMonths = JSON.parse(res.value);
          const month = allMonths[monthKey];
          if (month) {
            setEntradas((month.entradas || []).map((e) => ({ ...e })));
            setSalidas((month.salidas || []).map((e) => ({ ...e })));
            const raw = month.descuentos || [];
            const desc = Array.isArray(raw) ? raw : Object.entries(raw).map(([label, valor]) => ({ label, valor }));
            setDescuentos(desc.map((e) => ({ ...e })));
          }
        }
      } catch {}
      try {
        const res = await window.storage.get(STORAGE_SPLITTER_PEOPLE);
        if (res?.value) {
          setPeople(JSON.parse(res.value));
        } else {
          setPeople([
            { id: "p1", name: t("splitter.person1"), color: SPLITTER_COLORS[0], share: 50 },
            { id: "p2", name: t("splitter.person2"), color: SPLITTER_COLORS[1], share: 50 },
          ]);
        }
      } catch {}
    })();
  }, [monthKey]);

  useEffect(() => {
    if (people.length > 0) {
      window.storage.set(STORAGE_SPLITTER_PEOPLE, JSON.stringify(people)).catch(() => {});
    }
  }, [people]);

  const totalEntradas = entradas.reduce((s, e) => s + (e.valor || 0), 0);
  const totalSalidas = salidas.reduce((s, e) => s + (e.valor || 0), 0);
  const totalDesc = descuentos.reduce((s, e) => s + (e.valor || 0), 0);
  const neto = totalEntradas - totalSalidas;
  const pool = neto - totalDesc;
  const totalShares = people.reduce((s, p) => s + (p.share || 0), 0);

  const perPerson = people.map((p) => {
    const pct = totalShares > 0 ? p.share / totalShares : 0;
    const initials = p.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
    return { ...p, pct, amount: pool * pct, initials };
  });

  const upd = (set, i, key, v) => set((xs) => xs.map((x, j) => j === i ? { ...x, [key]: v } : x));
  const rm = (set, i) => set((xs) => xs.filter((_, j) => j !== i));
  const add = (set, row) => set((xs) => [...xs, row]);

  const fmtShort = (n) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`;
    return String(Math.round(n));
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden animate-fade-in" style={{ fontVariantNumeric: "tabular-nums" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-end">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{fmtMonth(today, lang === "en" ? "en-US" : "es-ES")}</div>
          <div className="text-lg font-bold text-slate-900 dark:text-zinc-50 font-mono tracking-tight mt-1">{t("nav.splitter")}</div>
        </div>
        <div className="flex gap-5 items-center">
          <StatBadge label={t("splitter.neto")} value={neto} color={neto >= 0 ? "#34d399" : "#f87171"} locale={locale} currency={currency} />
          <StatBadge label={t("splitter.discounts")} value={totalDesc} color="#fbbf24" locale={locale} currency={currency} />
          <StatBadge label={t("splitter.pool")} value={pool} color="#60a5fa" locale={locale} currency={currency} big />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <SplitterColumn
            title={t("splitter.entradas")} total={totalEntradas} color="#34d399"
            rows={entradas} labelKey="concepto" valueKey="valor"
            onUpd={(i, k, v) => upd(setEntradas, i, k, v)}
            onRm={(i) => rm(setEntradas, i)}
            onAdd={() => add(setEntradas, { concepto: t("splitter.newRow"), valor: 0 })}
            locale={locale} currency={currency} t={t}
          />
          <SplitterColumn
            title={t("splitter.salidas")} total={totalSalidas} color="#f87171"
            rows={salidas} labelKey="concepto" valueKey="valor"
            onUpd={(i, k, v) => upd(setSalidas, i, k, v)}
            onRm={(i) => rm(setSalidas, i)}
            onAdd={() => add(setSalidas, { concepto: t("splitter.newRow"), valor: 0 })}
            locale={locale} currency={currency} t={t}
          />
          <SplitterColumn
            title={t("splitter.discounts")} total={totalDesc} color="#fbbf24"
            rows={descuentos} labelKey="label" valueKey="valor"
            onUpd={(i, k, v) => upd(setDescuentos, i, k, v)}
            onRm={(i) => rm(setDescuentos, i)}
            onAdd={() => add(setDescuentos, { label: t("splitter.newRow"), valor: 0 })}
            locale={locale} currency={currency} t={t}
          />

          <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-700">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-blue-500">{t("splitter.people")} · {people.length}</span>
              <span className="font-mono text-xs font-semibold text-blue-500">{fmt(pool, locale, currency)}</span>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {perPerson.map((p, i) => (
                <div key={p.id} className="rounded-xl p-2.5 flex flex-col gap-2" style={{ background: `${p.color}14`, border: `1px solid ${p.color}33` }}>
                  <div className="flex gap-2 items-center">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}55` }}>
                      {p.initials}
                    </div>
                    <input
                      value={p.name}
                      onChange={(e) => setPeople((ps) => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="flex-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-slate-800 dark:text-zinc-100 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50 min-w-0"
                    />
                    <button onClick={() => setPeople((ps) => ps.filter((_, j) => j !== i))} className="text-slate-300 dark:text-zinc-600 hover:text-rose-500 transition p-0.5">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input type="range" min="0" max="100" value={p.share}
                      onChange={(e) => setPeople((ps) => ps.map((x, j) => j === i ? { ...x, share: +e.target.value } : x))}
                      className="flex-1" style={{ accentColor: p.color }}
                    />
                    <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-500 w-6 text-right">{p.share}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 dark:text-zinc-600">{Math.round(p.pct * 100)}%</span>
                    <span className="font-mono font-semibold text-sm" style={{ color: p.color }}>{fmt(p.amount, locale, currency)}</span>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const idx = people.length;
                  const col = SPLITTER_COLORS[idx % SPLITTER_COLORS.length];
                  setPeople((ps) => [...ps, { id: "p" + Date.now(), name: t("splitter.newRow"), color: col, share: 50 }]);
                }}
                className="mt-1 border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 text-xs py-1.5 px-2 transition flex items-center gap-1 justify-center"
              >
                <Plus size={11} /> {t("splitter.addPerson")}
              </button>
            </div>
          </div>
        </div>

        {perPerson.length > 0 && pool > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-mono font-semibold tracking-widest text-slate-400 dark:text-zinc-600 uppercase">{t("splitter.distribution")}</div>
            <div className="h-8 rounded-lg overflow-hidden flex border border-slate-200 dark:border-zinc-800">
              {perPerson.map((p) => (
                <div key={p.id}
                  className="flex items-center justify-center text-[11px] font-bold overflow-hidden whitespace-nowrap px-1"
                  style={{ flex: p.amount || 0.0001, background: p.color, color: "#fff" }}>
                  {p.amount > pool * 0.08 ? `${p.name} · ${fmtShort(p.amount)}` : ""}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DEBT KILLER ──────────────────────────────────────────────────────────────
function LoanDonut({ pct, color }) {
  const size = 110, stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safePct = Math.max(0, Math.min(100, pct || 0));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3f3f46" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${(safePct / 100) * c} ${c}`} strokeLinecap="round" />
    </svg>
  );
}

function DebtKiller() {
  const { t, locale, currency, lang } = useI18n();
  const today = new Date();
  const [viewDate, setViewDate] = useState(today);
  const [allMonths, setAllMonths] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [pickerPos, setPickerPos] = useState(null);
  const brandRef = useRef();
  const pickerDropRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_FLUJO);
        if (r?.value) setAllMonths(JSON.parse(r.value));
        else setAllMonths({});
      } catch { setAllMonths({}); }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!pickerPos) return;
    const handler = (e) => {
      if (!brandRef.current?.contains(e.target) && !pickerDropRef.current?.contains(e.target)) setPickerPos(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerPos]);

  const openPicker = (e) => {
    e.stopPropagation();
    if (pickerPos) { setPickerPos(null); return; }
    const r = brandRef.current.getBoundingClientRect();
    setPickerPos({ top: r.bottom + 6, left: r.left });
  };

  const viewKey = toMonthKey(viewDate);
  const monthData = allMonths[viewKey];
  const prestamos = monthData?.prestamos || { conceptos: [], abonos: [] };

  const fmtShort = (n) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`;
    return String(Math.round(n));
  };

  const totalLoans = prestamos.conceptos.reduce((s, p) => s + (p.cantidad || 0), 0);
  const totalAbonos = prestamos.abonos.reduce((s, a) => s + (a.valor || 0), 0);
  const remaining = Math.max(0, totalLoans - totalAbonos);
  const avgAbono = prestamos.abonos.length > 0 ? totalAbonos / prestamos.abonos.length : 0;
  const monthsLeft = avgAbono > 0 ? Math.ceil(remaining / avgAbono) : 0;

  const loans = prestamos.conceptos.map((p, i) => {
    const paid = prestamos.abonos[i]?.valor || 0;
    return {
      ...p,
      paid,
      abonos: prestamos.abonos[i] ? [prestamos.abonos[i]] : [],
      remaining: Math.max(0, (p.cantidad || 0) - paid),
      pct: p.cantidad > 0 ? (paid / p.cantidad) * 100 : 0,
    };
  });

  const PAID_COLOR = "#34d399";
  const UNPAID_COLOR = "#f87171";
  const SCHED_COLOR = "#60a5fa";

  if (!loaded) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden animate-fade-in" style={{ fontVariantNumeric: "tabular-nums" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-end">
        <div>
          <button ref={brandRef} onClick={openPicker}
            className="flex items-center gap-1 text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer select-none">
            {fmtMonth(viewDate, lang === "en" ? "en-US" : "es-ES")}
            <ChevronDown size={10} className={cn("transition-transform", pickerPos && "rotate-180")} />
          </button>
          <div className="text-lg font-bold text-slate-900 dark:text-zinc-50 font-mono tracking-tight mt-1">{t("nav.debtKiller")}</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="px-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl p-4">
          <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("debt.totalDebt")}</div>
          <div className="text-xl font-bold font-mono mt-1.5 text-slate-900 dark:text-zinc-50">{fmt(totalLoans, locale, currency)}</div>
          <div className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1">{loans.length} {t("debt.activeLoans")}</div>
        </div>
        <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl p-4">
          <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("summary.paid")}</div>
          <div className="text-xl font-bold font-mono mt-1.5" style={{ color: PAID_COLOR }}>{fmt(totalAbonos, locale, currency)}</div>
          <div className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1">{totalLoans > 0 ? Math.round(totalAbonos / totalLoans * 100) : 0}% {t("debt.ofTotal")}</div>
        </div>
        <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl p-4">
          <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("flujo.restante")}</div>
          <div className="text-xl font-bold font-mono mt-1.5" style={{ color: UNPAID_COLOR }}>{fmt(remaining, locale, currency)}</div>
          <div className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1">{t("debt.toCollect")}</div>
        </div>
        <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl p-4">
          <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("debt.projection")}</div>
          <div className="text-xl font-bold font-mono mt-1.5" style={{ color: SCHED_COLOR }}>{monthsLeft > 0 ? `${monthsLeft} ${t("debt.months")}` : "—"}</div>
          <div className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1">
            {avgAbono > 0 ? `${t("debt.atCurrentRate")} (${fmtShort(avgAbono)}${t("debt.perMonth")})` : t("debt.noPaymentsYet")}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {loans.length === 0 && (
        <div className="text-center py-16 px-6">
          <p className="text-slate-400 dark:text-zinc-500 text-sm">{t("debt.noLoans")}</p>
        </div>
      )}

      {/* Loan cards */}
      {loans.length > 0 && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {loans.map((l, i) => (
            <div key={l.id || i} className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
              {/* Header + donut */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 tracking-widest uppercase">{t("debt.loanLabel")}{i + 1}</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-zinc-50 mt-1">{l.nombre || "—"}</div>
                </div>
                <div className="relative w-[110px] h-[110px] shrink-0">
                  <LoanDonut pct={l.pct} color={PAID_COLOR} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-zinc-50">{Math.round(l.pct)}%</div>
                    <div className="text-[9px] text-slate-400 dark:text-zinc-500">{t("debt.paidLabel")}</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t("col.cantidad"), value: fmtShort(l.cantidad || 0), color: "#e4e4e7" },
                  { label: t("summary.paid"), value: fmtShort(l.paid), color: PAID_COLOR },
                  { label: t("debt.left"), value: fmtShort(l.remaining), color: UNPAID_COLOR },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 tracking-widest uppercase">{label}</div>
                    <div className="text-sm font-bold font-mono mt-0.5" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Abono history */}
              <div>
                <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 tracking-widest uppercase mb-2">{t("debt.history")}</div>
                <div className="flex flex-col gap-1.5">
                  {l.abonos.length === 0 ? (
                    <div className="text-xs text-slate-400 dark:text-zinc-600 italic">{t("debt.noPayments")}</div>
                  ) : l.abonos.map((a, j) => (
                    <div key={j} className="flex items-center gap-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PAID_COLOR }} />
                      <span className="flex-1 text-slate-700 dark:text-zinc-300">{t("debt.payment")} · {a.fecha}</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">{fmt(a.valor, locale, currency)}</span>
                    </div>
                  ))}
                  {monthsLeft > 0 && Array.from({ length: Math.min(3, monthsLeft) }).map((_, j) => (
                    <div key={"p" + j} className="flex items-center gap-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2 text-xs opacity-50 border border-dashed border-slate-200 dark:border-zinc-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600 shrink-0" />
                      <span className="flex-1 text-slate-400 dark:text-zinc-500">{t("debt.projected")} +{j + 1}</span>
                      <span className="font-mono text-slate-400 dark:text-zinc-500">{fmtShort(avgAbono)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pickerPos && (
        <MonthYearPicker pos={pickerPos} dropRef={pickerDropRef} viewDate={viewDate}
          onSelect={(d) => { setViewDate(d); setPickerPos(null); }} />
      )}
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const { t, lang, setLang, theme, setTheme } = useI18n();
  const [tab, setTab] = useState("ledger");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [importedExpenses, setImportedExpenses] = useState(null);
  const [importedFlujo, setImportedFlujo] = useState(null);

  const handleExport = async () => {
    try {
      const [e, f] = await Promise.all([window.storage.get(STORAGE_EXPENSES), window.storage.get(STORAGE_FLUJO)]);
      exportData(e && e.value ? JSON.parse(e.value) : {}, f && f.value ? JSON.parse(f.value) : {});
    } catch (err) { console.error("Export error:", err); }
  };

  const handleImport = async (parsed) => {
    if (!parsed.expenses || !parsed.flujo) return;
    try { await window.storage.set(STORAGE_EXPENSES, JSON.stringify(parsed.expenses)); } catch (e) { console.error(e); }
    try { await window.storage.set(STORAGE_FLUJO, JSON.stringify(parsed.flujo)); } catch (e) { console.error(e); }
    setImportedExpenses(parsed.expenses);
    setImportedFlujo(parsed.flujo);
  };

  const navItems = [
    { id: "ledger", label: t("nav.ledger"), Icon: BookOpen },
    { id: "splitter", label: t("nav.splitter"), Icon: Users },
    { id: "debtKiller", label: t("nav.debtKiller"), Icon: Target },
    // { id: "expenses", label: t("nav.expenses"), Icon: LayoutList },
    // { id: "flujo", label: t("nav.flujo"), Icon: TrendingUp },
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
        {!collapsed && <span className="font-mono font-bold text-slate-800 dark:text-zinc-100 text-sm tracking-wide">{t("ledger.brand")}</span>}
      </div>

      {!collapsed && (
        <div className="px-1 mb-1">
          <span className="font-mono text-xs font-semibold text-slate-400 dark:text-zinc-600 uppercase tracking-widest">{t("nav.menu")}</span>
        </div>
      )}

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
            {tab === "expenses" ? t("nav.expenses") : tab === "flujo" ? t("nav.flujo") : tab === "splitter" ? t("nav.splitter") : tab === "debtKiller" ? t("nav.debtKiller") : t("nav.ledger")}
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
            {tab === "expenses" && <ExpenseTracker importedData={importedExpenses} />}
            {tab === "flujo" && <FlujoCaja importedData={importedFlujo} />}
            {tab === "ledger" && <Ledger />}
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
