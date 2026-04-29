import { useState, useEffect, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, ChevronDown, Cloud,
  Moon, Sun, Menu, X, Wallet, BookOpen, Users, Target, Settings, Camera, Check, Loader2,
} from "lucide-react";
import { useI18n } from "./i18n/index.jsx";
import { cn } from "./lib/utils.js";
import { fetchCategories, fetchExpenses, updateExpense, createCategory, createExpense, deleteExpense as deleteExpenseApi, deleteCategory as deleteCategoryApi, fetchSplitters, createSplitter, updateSplitter, deleteSplitter, fetchPeople, createPerson, updatePerson, deletePerson, fetchDebts, createDebt, deleteDebt, distributePayment, createDebtPayment, deleteDebtPayment } from "./api.js";

// ─── SHARED ───────────────────────────────────────────────────────────────────
const toMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const fmt = (n, locale = "es-CO", currency = "COP") =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0 }).format(n || 0);
const fmtMonth = (date, locale = "es-ES") =>
  new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date).toUpperCase();
const STORAGE_FLUJO = "flujo-caja-data";

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, description, children, actions }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

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


// ─── EXPENSES ───────────────────────────────────────────────────────────────────
const SECTION_COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa"];

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

function Expenses() {
  const { t, locale, currency, lang } = useI18n();
  const today = new Date();
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // { id, section_id, name, amount }
  const [newCategory, setNewCategory] = useState(null); // null | string
  const [pendingDelete, setPendingDelete] = useState(null); // null | { id, name }
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState(null); // null | { id, name }
  const [editAmountFocused, setEditAmountFocused] = useState(false);
  const [newAmountFocused, setNewAmountFocused] = useState(false);
  const [newExpense, setNewExpense] = useState(null); // null | { section_id, name, amount }
  const [viewDate, setViewDate] = useState(today);
  const [pickerPos, setPickerPos] = useState(null);
  const brandRef = useRef();
  const pickerDropRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const [secs, exps] = await Promise.all([fetchCategories(), fetchExpenses()]);
        setCategories(secs);
        setExpenses(exps);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
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

  // TODO: pass month to fetchExpenses() once backend adds date field
  const grouped = categories.map((s) => ({
    ...s,
    items: expenses.filter((e) => e.category_id === s.id),
  }));

  const all = expenses;
  const grandTotal = all.reduce((s, e) => s + e.amount, 0);
  const paidTotal = all.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);
  const pending = grandTotal - paidTotal;

  const handleStatusChange = async (id, newStatus) => {
    const prev = expenses.find((e) => e.id === id);
    setExpenses((xs) => xs.map((e) => e.id === id ? { ...e, status: newStatus } : e));
    try {
      await updateExpense(id, { status: newStatus });
    } catch {
      setExpenses((xs) => xs.map((e) => e.id === id ? { ...e, status: prev.status } : e));
    }
  };

  useEffect(() => { setEditAmountFocused(false); }, [editing?.id]);
  useEffect(() => { setNewAmountFocused(false); }, [newExpense?.category_id]);

  const handleDeleteExpense = async () => {
    if (!pendingDeleteExpense) return;
    const { id } = pendingDeleteExpense;
    setPendingDeleteExpense(null);
    setExpenses((xs) => xs.filter((e) => e.id !== id));
    try {
      await deleteExpenseApi(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    setCategories((xs) => xs.filter((c) => c.id !== id));
    setExpenses((xs) => xs.filter((e) => e.category_id !== id));
    try {
      await deleteCategoryApi(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCategory = async () => {
    const name = (newCategory || "").trim();
    if (!name) return;
    setNewCategory(null);
    try {
      const sec = await createCategory(name);
      setCategories((xs) => [...xs, sec]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateExpense = async () => {
    if (!newExpense) return;
    const name = (newExpense.name || "").trim();
    if (!name) return;
    const draft = { ...newExpense, name };
    setNewExpense(null);
    try {
      const exp = await createExpense(draft.category_id, draft.name, draft.amount);
      setExpenses((xs) => [...xs, exp]);
    } catch (e) {
      console.error(e);
    }
  };

  const saveEditing = async () => {
    if (!editing) return;
    const prev = expenses.find((e) => e.id === editing.id);
    setExpenses((xs) => xs.map((e) => e.id === editing.id ? { ...e, name: editing.name, amount: editing.amount } : e));
    setEditing(null);
    try {
      await updateExpense(editing.id, { expense: editing.name, value: editing.amount });
    } catch {
      setExpenses((xs) => xs.map((e) => e.id === editing.id ? { ...e, name: prev.name, amount: prev.amount } : e));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64 text-rose-400 dark:text-rose-500 text-sm font-mono">
      {error}
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ fontVariantNumeric: "tabular-nums" }}>
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-end">
          <div>
            <button ref={brandRef} onClick={openPicker}
              className="flex items-center gap-1 text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer select-none group">
              {fmtMonth(viewDate, lang === "en" ? "en-US" : "es-ES")}
              <ChevronDown size={10} className={cn("transition-transform", pickerPos && "rotate-180")} />
            </button>
            <div className="text-lg font-bold text-slate-900 dark:text-zinc-50 font-mono tracking-tight mt-1">{t("expenses.title")}</div>
          </div>
          <div className="text-right font-mono text-xs text-slate-400 dark:text-zinc-500 leading-relaxed">
            <div>{t("summary.total")} · <span className="text-slate-900 dark:text-zinc-100 font-semibold">{fmt(grandTotal, locale, currency)}</span></div>
            <div>
              {t("summary.paid")} · <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(paidTotal, locale, currency)}</span>
              {" "}&nbsp;{t("expenses.pending")} · <span className="text-rose-600 dark:text-rose-400 font-semibold">{fmt(pending, locale, currency)}</span>
            </div>
            <div className="text-[10px] text-slate-300 dark:text-zinc-600 mt-0.5">{all.length} {t("expenses.transactions")} · {categories.length} {t("expenses.categories")}</div>
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
              {grouped.map((sec, si) => {
                const catTotal = sec.items.reduce((s, e) => s + e.amount, 0);
                const color = SECTION_COLORS[si % SECTION_COLORS.length];
                return (
                  <Fragment key={sec.id}>
                    <tr className="border-t-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/40">
                      <td className="py-2.5 px-3">
                        <span style={{ color }} className="text-[10px]">■</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-zinc-100 tracking-widest uppercase">
                        <span className="flex items-center gap-2">
                          {sec.name}
                          <button
                            onClick={() => setNewExpense({ category_id: sec.id, name: "", amount: 0 })}
                            className="inline-flex items-center justify-center w-4 h-4 rounded text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                            title="Add expense"
                          >
                            <Plus size={10} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: sec.id, name: sec.name }); }}
                            className="inline-flex items-center justify-center w-4 h-4 rounded text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                            title={t("category.delete")}
                          >
                            <Trash2 size={10} />
                          </button>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 dark:text-zinc-400">{fmt(catTotal, locale, currency)}</td>
                      <td className="py-2.5 px-3 text-center text-slate-400 dark:text-zinc-600 text-[10px]">{sec.items.length} items</td>
                    </tr>
                    {sec.items.map((e, i) => (
                      <tr key={e.id}
                        onClick={() => setEditing({ id: e.id, section_id: e.section_id, name: e.name, amount: e.amount })}
                        className={cn(
                          "border-b border-dashed border-slate-100 dark:border-zinc-800/60 transition-colors",
                          i % 2 === 1 ? "bg-slate-50/50 dark:bg-zinc-900/40" : "",
                          "hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 cursor-pointer"
                        )}>
                        <td className="py-1.5 px-3 w-8" onClick={(ev) => ev.stopPropagation()}>
                          <button
                            onClick={() => setPendingDeleteExpense({ id: e.id, name: e.name })}
                            className="inline-flex items-center justify-center w-4 h-4 rounded text-slate-300 dark:text-zinc-600 hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                        </td>
                        <td className="py-1.5 px-3 text-slate-700 dark:text-zinc-300">{e.name}</td>
                        <td className={cn("py-1.5 px-3 text-right font-semibold", AMOUNT_CLS[e.status] || "text-slate-700 dark:text-zinc-300")}>
                          {fmt(e.amount, locale, currency)}
                        </td>
                        <td className="py-1.5 px-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                          <StatusPicker status={e.status} onChange={(v) => handleStatusChange(e.id, v)} />
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
            <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{t("expenses.finalBalance")}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">{t("summary.paid")}</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmt(paidTotal, locale, currency)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">{t("expenses.pending")}</div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400">{fmt(pending, locale, currency)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">{t("summary.total")}</div>
            <div className="text-base font-bold text-slate-900 dark:text-zinc-100">{fmt(grandTotal, locale, currency)}</div>
          </div>
        </div>
      </div>

      {/* Add section */}
      <button
        onClick={() => setNewCategory("")}
        className="mt-2 w-full border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg text-slate-400 dark:text-zinc-600 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 dark:hover:border-emerald-600 text-xs font-mono py-2 transition flex items-center gap-1.5 justify-center"
      >
        <Plus size={11} /> {t("expenses.newCategory")}
      </button>

      {/* Month/year picker — display only until backend adds date field */}
      {pickerPos && (
        <MonthYearPicker pos={pickerPos} dropRef={pickerDropRef} viewDate={viewDate}
          onSelect={(d) => { setViewDate(d); setPickerPos(null); }} />
      )}

      {/* New section modal */}
      <Modal open={newCategory !== null} onClose={() => setNewCategory(null)}
        title={t("expenses.newCategory")}
        actions={<>
          <Btn onClick={() => setNewCategory(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleCreateCategory}>{t("btn.save")}</Btn>
        </>}
      >
        <div className="mb-2">
          <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Name</label>
          <input
            type="text"
            value={newCategory ?? ""}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
            autoFocus
            className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
          />
        </div>
      </Modal>

      {/* Delete expense modal */}
      <Modal open={!!pendingDeleteExpense} onClose={() => setPendingDeleteExpense(null)}
        title={t("expense.deleteTitle")}
        description={t("expense.deleteDesc").replace("{name}", pendingDeleteExpense?.name ?? "")}
        actions={<>
          <Btn onClick={() => setPendingDeleteExpense(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="danger" size="md" onClick={handleDeleteExpense}>{t("btn.delete")}</Btn>
        </>}
      />

      {/* Delete category modal */}
      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)}
        title={t("category.deleteTitle")}
        description={t("category.deleteDesc").replace("{name}", pendingDelete?.name ?? "")}
        actions={<>
          <Btn onClick={() => setPendingDelete(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="danger" size="md" onClick={handleDeleteCategory}>{t("btn.delete")}</Btn>
        </>}
      />

      {/* New expense modal */}
      <Modal open={!!newExpense} onClose={() => setNewExpense(null)}
        title="New expense"
        actions={<>
          <Btn onClick={() => setNewExpense(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleCreateExpense}>{t("btn.save")}</Btn>
        </>}
      >
        {newExpense && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.expense")}</label>
              <input
                type="text"
                value={newExpense.name}
                onChange={(e) => setNewExpense((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreateExpense()}
                autoFocus
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.value")}</label>
              {newAmountFocused ? (
                <input
                  type="number"
                  value={newExpense.amount || ""}
                  autoFocus
                  onChange={(e) => setNewExpense((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  onBlur={() => setNewAmountFocused(false)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateExpense()}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
                />
              ) : (
                <input
                  readOnly
                  value={newExpense.amount === 0 ? "" : fmt(newExpense.amount, locale, currency)}
                  onFocus={() => setNewAmountFocused(true)}
                  placeholder="0"
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right cursor-text"
                />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit expense modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)}
        title={t("expenses.editTitle")}
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
              {editAmountFocused ? (
                <input
                  type="number"
                  value={editing.amount || ""}
                  autoFocus
                  onChange={(e) => setEditing((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  onBlur={() => setEditAmountFocused(false)}
                  onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
                />
              ) : (
                <input
                  readOnly
                  value={editing.amount === 0 ? "" : fmt(editing.amount, locale, currency)}
                  onFocus={() => setEditAmountFocused(true)}
                  placeholder="0"
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right cursor-text"
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── SPLITTER ─────────────────────────────────────────────────────────────────
const SPLITTER_COLORS = ["#10b981", "#8b5cf6", "#f59e0b", "#3b82f6", "#f43f5e", "#06b6d4"];

function StatBadge({ label, value, color, big, locale, currency }) {
  return (
    <div className="text-right">
      <div className="text-[9px] font-mono font-semibold tracking-widest uppercase text-slate-400 dark:text-zinc-600">{label}</div>
      <div className="font-mono font-semibold mt-0.5" style={{ fontSize: big ? 20 : 13, color }}>{fmt(value, locale, currency)}</div>
    </div>
  );
}

function SplitterColumn({ title, total, color, rows, labelKey, valueKey, onEdit, onAdd, locale, currency, t, people }) {
  const getPersonBadge = (row) => {
    if (!row.person_id || !people) return null;
    const person = people.find((p) => p.id === row.person_id);
    if (!person) return null;
    const initials = person.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
    return (
      <span className="w-5 h-5 rounded-full grid place-items-center text-[9px] font-bold shrink-0"
        style={{ background: `${person.color}22`, color: person.color, border: `1px solid ${person.color}55`, lineHeight: 1 }}>
        {initials}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color }}>{title}</span>
        <span className="font-mono text-xs font-semibold" style={{ color }}>{fmt(total, locale, currency)}</span>
      </div>
      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
        {rows.map((r, i) => (
          <div
            key={i}
            onClick={() => onEdit(i)}
            className="flex gap-1.5 items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-md px-2 py-1.5 -mx-2 transition-colors"
          >
            {getPersonBadge(r)}
            <span className="flex-1 text-xs text-slate-800 dark:text-zinc-100 truncate">{r[labelKey] || "—"}</span>
            <span className="font-mono text-xs text-slate-600 dark:text-zinc-300 shrink-0">{fmt(r[valueKey], locale, currency)}</span>
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
  const { t, locale, currency, lang, theme } = useI18n();
  const today = new Date();
  const monthKey = toMonthKey(today);

  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editModal, setEditModal] = useState(null);
  const [createModal, setCreateModal] = useState(null);
  const [amountFocused, setAmountFocused] = useState(false);

  const [personModal, setPersonModal] = useState(null);
  const [editPersonModal, setEditPersonModal] = useState(null);
  const [captureStatus, setCaptureStatus] = useState("idle");
  const captureRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [splitterData, peopleData] = await Promise.all([
          fetchSplitters(monthKey),
          fetchPeople("splitter"),
        ]);
        setItems(splitterData);
        setPeople(peopleData.length > 0 ? peopleData : []);
      } catch (e) {
        console.error("Failed to load splitter data:", e);
        setItems([]);
        setPeople([]);
      }
      setLoading(false);
    })();
  }, [monthKey]);

  const entradas = items.filter((i) => i.type === "income");
  const salidas = items.filter((i) => i.type === "expense");
  const descuentos = items.filter((i) => i.type === "discount");

  const totalEntradas = entradas.reduce((s, e) => s + (e.value || 0), 0);
  const totalSalidas = salidas.reduce((s, e) => s + (e.value || 0), 0);
  const totalDesc = descuentos.reduce((s, e) => s + (e.value || 0), 0);
  const neto = totalEntradas - totalSalidas;
  const pool = neto;
  const totalShares = people.reduce((s, p) => s + (p.share || 0), 0);

  const perPerson = people.map((p) => {
    const pct = totalShares > 0 ? p.share / totalShares : 0;
    const personDiscounts = descuentos
      .filter((d) => d.person_id === p.id)
      .reduce((sum, d) => sum + (d.value || 0), 0);
    const initials = p.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
    return { ...p, pct, amount: (pool * pct) - personDiscounts, discounts: personDiscounts, initials };
  });

  const openCreate = (type) => {
    setCreateModal({ type, label: "", value: 0, person_id: type === "discount" && people.length > 0 ? people[0].id : null });
    setAmountFocused(false);
  };

  const handleCreate = async () => {
    if (!createModal) return;
    const { type, label, value, person_id } = createModal;
    const position = items.filter((i) => i.type === type).length;
    setCreateModal(null);
    try {
      const created = await createSplitter(monthKey, type, label || t("splitter.newRow"), value, position, type === "discount" ? person_id : null);
      setItems((xs) => [...xs, created]);
    } catch (e) {
      console.error("Failed to create splitter:", e);
    }
  };

  const openEdit = (type, rows, index) => {
    const row = rows[index];
    setEditModal({ type, id: row.id, label: row.label, value: row.value, person_id: row.person_id || null });
    setAmountFocused(false);
  };

  const handleEdit = async () => {
    if (!editModal) return;
    const { id, label, value, person_id, type } = editModal;
    setEditModal(null);
    setItems((xs) => xs.map((x) => x.id === id ? { ...x, label, value, person_id } : x));
    try {
      const patch = { label, value };
      if (type === "discount") patch.person_id = person_id;
      await updateSplitter(id, patch);
    } catch (e) {
      console.error("Failed to update splitter:", e);
    }
  };

  const handleDelete = async () => {
    if (!editModal) return;
    const { id } = editModal;
    setEditModal(null);
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      await deleteSplitter(id);
    } catch (e) {
      console.error("Failed to delete splitter:", e);
    }
  };

  const openCreatePerson = () => {
    const idx = people.length;
    const color = SPLITTER_COLORS[idx % SPLITTER_COLORS.length];
    setPersonModal({ name: "", color, share: 50 });
  };

  const handleCreatePerson = async () => {
    if (!personModal) return;
    const { name, color, share } = personModal;
    const position = people.length;
    setPersonModal(null);
    try {
      const created = await createPerson(name || t("splitter.newRow"), color, share, position);
      setPeople((ps) => [...ps, created]);
    } catch (e) {
      console.error("Failed to create person:", e);
    }
  };

  const openEditPerson = (index) => {
    const p = people[index];
    setEditPersonModal({ id: p.id, name: p.name, color: p.color, share: p.share, index });
  };

  const handleEditPerson = async () => {
    if (!editPersonModal) return;
    const { id, name, color, share } = editPersonModal;
    setEditPersonModal(null);
    setPeople((ps) => ps.map((p) => p.id === id ? { ...p, name, color, share } : p));
    try {
      await updatePerson(id, { name, color, share });
    } catch (e) {
      console.error("Failed to update person:", e);
    }
  };

  const handleDeletePerson = async () => {
    if (!editPersonModal) return;
    const { id } = editPersonModal;
    setEditPersonModal(null);
    setPeople((ps) => ps.filter((p) => p.id !== id));
    try {
      await deletePerson(id);
    } catch (e) {
      console.error("Failed to delete person:", e);
    }
  };

  const fmtShort = (n) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`;
    return String(Math.round(n));
  };

  const handleCapture = async () => {
    if (captureStatus !== "idle") return;
    setCaptureStatus("generating");
    try {
      if (!window.html2canvas) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        await new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.head.appendChild(script); });
      }
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await window.html2canvas(captureRef.current, { backgroundColor: "#ffffff", scale: 2 });
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setCaptureStatus("copied");
          setTimeout(() => setCaptureStatus("idle"), 2000);
        } catch {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `splitter-${monthKey}.png`; a.click();
          URL.revokeObjectURL(url);
          setCaptureStatus("idle");
        }
      }, "image/png");
    } catch (e) {
      console.error("Capture failed:", e);
      setCaptureStatus("idle");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden animate-fade-in" style={{ fontVariantNumeric: "tabular-nums" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-end">
        <div className="flex items-end gap-3">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{fmtMonth(today, lang === "en" ? "en-US" : "es-ES")}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-zinc-50 font-mono tracking-tight mt-1">{t("nav.splitter")}</div>
          </div>
          <button
            onClick={handleCapture}
            disabled={captureStatus !== "idle"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all",
              captureStatus === "copied"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300"
            )}
          >
            {captureStatus === "generating" ? (
              <><Cloud size={14} className="animate-pulse" /> {t("btn.generating")}</>
            ) : captureStatus === "copied" ? (
              <><Check size={14} /> {t("btn.copied")}</>
            ) : (
              <><Camera size={14} /> {t("btn.capture")}</>
            )}
          </button>
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
            rows={entradas} labelKey="label" valueKey="value"
            onEdit={(i) => openEdit("income", entradas, i)}
            onAdd={() => openCreate("income")}
            locale={locale} currency={currency} t={t}
          />
          <SplitterColumn
            title={t("splitter.salidas")} total={totalSalidas} color="#f87171"
            rows={salidas} labelKey="label" valueKey="value"
            onEdit={(i) => openEdit("expense", salidas, i)}
            onAdd={() => openCreate("expense")}
            locale={locale} currency={currency} t={t}
          />
          <SplitterColumn
            title={t("splitter.discounts")} total={totalDesc} color="#fbbf24"
            rows={descuentos} labelKey="label" valueKey="value"
            onEdit={(i) => openEdit("discount", descuentos, i)}
            onAdd={() => openCreate("discount")}
            locale={locale} currency={currency} t={t} people={people}
          />

          <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-700">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-blue-500">{t("splitter.people")} · {people.length}</span>
              <span className="font-mono text-xs font-semibold text-blue-500">{fmt(pool, locale, currency)}</span>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {perPerson.map((p, i) => (
                <div
                  key={p.id}
                  onClick={() => openEditPerson(i)}
                  className="rounded-xl p-2.5 flex flex-col gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: `${p.color}14`, border: `1px solid ${p.color}33` }}
                >
                  <div className="flex gap-2 items-center">
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        position: 'relative',
                        background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}55`
                      }}>
                      <span style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: 10, fontWeight: 'bold', lineHeight: 1,
                        whiteSpace: 'nowrap'
                      }}>{p.initials}</span>
                    </div>
                    <span className="flex-1 text-xs text-slate-800 dark:text-zinc-100 truncate">{p.name}</span>
                    <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-500">{p.share}%</span>
                  </div>
                  <div className="flex justify-between text-xs pl-9">
                    <span className="text-slate-400 dark:text-zinc-600">{Math.round(p.pct * 100)}% {t("splitter.ofPool")}</span>
                    <span className="font-mono font-semibold" style={{ color: p.color }}>{fmt(p.amount, locale, currency)}</span>
                  </div>
                  {p.features?.length > 0 && (
                    <div className="flex gap-1 pl-9">
                      {p.features.map((f) => (
                        <span
                          key={f}
                          className="text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: `${p.color}22`, color: p.color }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={openCreatePerson}
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

      {/* Create modal */}
      <Modal open={!!createModal} onClose={() => setCreateModal(null)}
        title={createModal?.type === "income" ? t("splitter.entradas") : createModal?.type === "expense" ? t("splitter.salidas") : t("splitter.discounts")}
        actions={<>
          <Btn onClick={() => setCreateModal(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleCreate}>{t("btn.save")}</Btn>
        </>}
      >
        {createModal && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.concept")}</label>
              <input
                type="text"
                value={createModal.label}
                onChange={(e) => setCreateModal((p) => ({ ...p, label: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.value")}</label>
              {amountFocused ? (
                <input
                  type="number"
                  value={createModal.value || ""}
                  autoFocus
                  onChange={(e) => setCreateModal((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
                  onBlur={() => setAmountFocused(false)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
                />
              ) : (
                <input
                  readOnly
                  value={createModal.value === 0 ? "" : fmt(createModal.value, locale, currency)}
                  onFocus={() => setAmountFocused(true)}
                  placeholder="0"
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right cursor-text"
                />
              )}
            </div>
            {createModal.type === "discount" && people.length > 0 && (
              <div>
                <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("splitter.people")}</label>
                <select
                  value={createModal.person_id || ""}
                  onChange={(e) => setCreateModal((p) => ({ ...p, person_id: e.target.value || null }))}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)}
        title={editModal?.type === "income" ? t("splitter.entradas") : editModal?.type === "expense" ? t("splitter.salidas") : t("splitter.discounts")}
        actions={<>
          <Btn variant="danger" onClick={handleDelete}>{t("btn.delete")}</Btn>
          <Btn onClick={() => setEditModal(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleEdit}>{t("btn.save")}</Btn>
        </>}
      >
        {editModal && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.concept")}</label>
              <input
                type="text"
                value={editModal.label}
                onChange={(e) => setEditModal((p) => ({ ...p, label: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                autoFocus
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.value")}</label>
              {amountFocused ? (
                <input
                  type="number"
                  value={editModal.value || ""}
                  autoFocus
                  onChange={(e) => setEditModal((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
                  onBlur={() => setAmountFocused(false)}
                  onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
                />
              ) : (
                <input
                  readOnly
                  value={editModal.value === 0 ? "" : fmt(editModal.value, locale, currency)}
                  onFocus={() => setAmountFocused(true)}
                  placeholder="0"
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right cursor-text"
                />
              )}
            </div>
            {editModal.type === "discount" && people.length > 0 && (
              <div>
                <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("splitter.people")}</label>
                <select
                  value={editModal.person_id || ""}
                  onChange={(e) => setEditModal((p) => ({ ...p, person_id: e.target.value || null }))}
                  className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create person modal */}
      <Modal open={!!personModal} onClose={() => setPersonModal(null)}
        title={t("splitter.addPerson")}
        actions={<>
          <Btn onClick={() => setPersonModal(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleCreatePerson}>{t("btn.save")}</Btn>
        </>}
      >
        {personModal && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Name</label>
              <input
                type="text"
                value={personModal.name}
                onChange={(e) => setPersonModal((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreatePerson()}
                autoFocus
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Share %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={personModal.share}
                onChange={(e) => setPersonModal((p) => ({ ...p, share: parseInt(e.target.value) || 0 }))}
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Color</label>
              <div className="flex gap-2">
                {SPLITTER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setPersonModal((p) => ({ ...p, color: c }))}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: personModal.color === c ? "#fff" : "transparent", boxShadow: personModal.color === c ? `0 0 0 2px ${c}` : "none" }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit person modal */}
      <Modal open={!!editPersonModal} onClose={() => setEditPersonModal(null)}
        title={t("splitter.people")}
        actions={<>
          <Btn variant="danger" onClick={handleDeletePerson}>{t("btn.delete")}</Btn>
          <Btn onClick={() => setEditPersonModal(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleEditPerson}>{t("btn.save")}</Btn>
        </>}
      >
        {editPersonModal && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Name</label>
              <input
                type="text"
                value={editPersonModal.name}
                onChange={(e) => setEditPersonModal((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleEditPerson()}
                autoFocus
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Share %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editPersonModal.share}
                onChange={(e) => setEditPersonModal((p) => ({ ...p, share: parseInt(e.target.value) || 0 }))}
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Color</label>
              <div className="flex gap-2">
                {SPLITTER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditPersonModal((p) => ({ ...p, color: c }))}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: editPersonModal.color === c ? "#fff" : "transparent", boxShadow: editPersonModal.color === c ? `0 0 0 2px ${c}` : "none" }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Hidden capture layout */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {(() => {
          const isDark = theme === "dark";
          const bg = isDark ? "#18181b" : "#fff";
          const cardBg = isDark ? "#27272a" : "#f8fafc";
          const border = isDark ? "#3f3f46" : "#e2e8f0";
          const textPrimary = isDark ? "#fafafa" : "#1e293b";
          const textSecondary = isDark ? "#a1a1aa" : "#475569";
          const textMuted = isDark ? "#71717a" : "#94a3b8";

          const getPersonBadge = (row) => {
            if (!row.person_id) return null;
            const person = people.find((p) => p.id === row.person_id);
            if (!person) return null;
            const initials = person.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
            return (
              <svg width="20" height="20" style={{ flexShrink: 0 }}>
                <circle cx="10" cy="10" r="9.5" fill={`${person.color}22`} stroke={`${person.color}55`} strokeWidth="1"/>
                <text x="10" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill={person.color} fontFamily="inherit">{initials}</text>
              </svg>
            );
          };

          return (
            <div ref={captureRef} style={{ width: 500, padding: 24, background: bg, fontFamily: "ui-monospace, monospace" }}>
              {/* Header */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: textMuted, textTransform: "uppercase", letterSpacing: 2 }}>{fmtMonth(today, lang === "en" ? "en-US" : "es-ES")}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary }}>{t("nav.splitter")}</div>
                  <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: textMuted, textTransform: "uppercase" }}>{t("splitter.neto")}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: neto >= 0 ? "#34d399" : "#f87171" }}>{fmt(neto, locale, currency)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: textMuted, textTransform: "uppercase" }}>{t("splitter.discounts")}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#fbbf24" }}>{fmt(totalDesc, locale, currency)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: textMuted, textTransform: "uppercase" }}>{t("splitter.pool")}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa" }}>{fmt(pool, locale, currency)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Entradas */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#34d399", textTransform: "uppercase", letterSpacing: 1 }}>{t("splitter.entradas")}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#34d399" }}>{fmt(totalEntradas, locale, currency)}</span>
                </div>
                {entradas.map((e, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: i > 0 ? `1px dashed ${border}` : "none" }}>
                    <span style={{ fontSize: 12, color: textSecondary }}>{e.label}</span>
                    <span style={{ fontSize: 12, color: textMuted }}>{fmt(e.value, locale, currency)}</span>
                  </div>
                ))}
              </div>

              {/* Salidas */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#f87171", textTransform: "uppercase", letterSpacing: 1 }}>{t("splitter.salidas")}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#f87171" }}>{fmt(totalSalidas, locale, currency)}</span>
                </div>
                {salidas.map((e, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: i > 0 ? `1px dashed ${border}` : "none" }}>
                    <span style={{ fontSize: 12, color: textSecondary }}>{e.label}</span>
                    <span style={{ fontSize: 12, color: textMuted }}>{fmt(e.value, locale, currency)}</span>
                  </div>
                ))}
              </div>

              {/* Descuentos */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#fbbf24", textTransform: "uppercase", letterSpacing: 1 }}>{t("splitter.discounts")}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24" }}>{fmt(totalDesc, locale, currency)}</span>
                </div>
                {descuentos.map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i > 0 ? `1px dashed ${border}` : "none" }}>
                    {getPersonBadge(e)}
                    <span style={{ flex: 1, fontSize: 12, color: textSecondary }}>{e.label}</span>
                    <span style={{ fontSize: 12, color: textMuted }}>{fmt(e.value, locale, currency)}</span>
                  </div>
                ))}
              </div>

              {/* People */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#60a5fa", textTransform: "uppercase", letterSpacing: 1 }}>{t("splitter.people")} · {people.length}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#60a5fa" }}>{fmt(pool, locale, currency)}</span>
                </div>
                {perPerson.map((p, i) => (
                  <div key={p.id} style={{ background: `${p.color}14`, border: `1px solid ${p.color}33`, borderRadius: 10, padding: 10, marginTop: i > 0 ? 8 : 0 }}>
                    <svg width="100%" height="24" style={{ display: "block" }}>
                      <circle cx="12" cy="12" r="11.5" fill={`${p.color}22`} stroke={`${p.color}55`} strokeWidth="1"/>
                      <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fill={p.color} fontFamily="inherit">{p.initials}</text>
                      <text x="32" y="16" fontSize="12" fontWeight="500" fill={textPrimary} fontFamily="inherit">{p.name}</text>
                      <text x="100%" y="16" textAnchor="end" fontSize="11" fill={textMuted} fontFamily="inherit">{p.share}%</text>
                    </svg>
                    <div style={{ display: "table", width: "100%", marginTop: 6, paddingLeft: 32 }}>
                      <div style={{ display: "table-cell", fontSize: 11, color: textMuted }}>{Math.round(p.pct * 100)}% {t("splitter.ofPool")}</div>
                      <div style={{ display: "table-cell", textAlign: "right", fontSize: 13, fontWeight: 600, color: p.color }}>{fmt(p.amount, locale, currency)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Distribution bar */}
              {perPerson.length > 0 && pool > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{t("splitter.distribution")}</div>
                  {(() => {
                    const total = perPerson.reduce((s, p) => s + (p.amount > 0 ? p.amount : 0.0001), 0);
                    let xPct = 0;
                    return (
                      <svg width="100%" height="28" style={{ borderRadius: 6, border: `1px solid ${border}`, display: "block" }}>
                        {perPerson.map((p) => {
                          const wPct = ((p.amount > 0 ? p.amount : 0.0001) / total) * 100;
                          const cx = xPct + wPct / 2;
                          const x = xPct;
                          xPct += wPct;
                          return (
                            <g key={p.id}>
                              <rect x={`${x}%`} y="0" width={`${wPct}%`} height="28" fill={p.color}/>
                              {p.amount > pool * 0.08 && (
                                <text x={`${cx}%`} y="14" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="600" fill="#fff" fontFamily="inherit">
                                  {p.name} · {fmtShort(p.amount)}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })()}
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
  const { t, locale, currency } = useI18n();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", type: "i_owe", person_id: "", newPersonName: "", due_date: "" });
  const [formErrors, setFormErrors] = useState({});
  const [people, setPeople] = useState([]);
  const [addingPayment, setAddingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
  const [formAmountFocused, setFormAmountFocused] = useState(false);
  const [paymentAmountFocused, setPaymentAmountFocused] = useState(false);
  const [savingPayments, setSavingPayments] = useState(new Set());
  const [paymentError, setPaymentError] = useState("");
  const [debtTab, setDebtTab] = useState("owed_to_me");
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkForm, setBulkForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
  const [bulkAmountFocused, setBulkAmountFocused] = useState(false);
  const [confirmDeleteDebt, setConfirmDeleteDebt] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDebts(), fetchPeople()])
      .then(([d, p]) => { setDebts(d); setPeople(p); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (addingPayment) setAddingPayment(null);
      else if (confirmDeleteDebt) setConfirmDeleteDebt(null);
      else if (showBulkForm) setShowBulkForm(false);
      else if (showForm) { setShowForm(false); setFormErrors({}); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, addingPayment, showBulkForm, confirmDeleteDebt]);

  const byCreated = (a, b) => new Date(a.created_at) - new Date(b.created_at);
  const iOwe = debts.filter(d => d.type === "i_owe").sort(byCreated);
  const owedMe = debts.filter(d => d.type === "owed_to_me").sort(byCreated);

  const groupTotals = (items) => {
    const total = items.reduce((s, d) => s + (d.amount ?? 0), 0);
    const paid  = items.reduce((s, d) => s + (d.debt_payments ?? []).reduce((ps, p) => ps + (p.amount ?? 0), 0), 0);
    return { total, paid, remaining: Math.max(0, total - paid) };
  };

  const fmtShort = (n) => {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
    return `$${Math.round(n)}`;
  };

  const fmtPayDate = (iso) => {
    if (!iso) return "";
    const [, m, d] = iso.split("-");
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
  };

  async function handleCreate(e) {
    e.preventDefault();
    const errs = {};
    if (!form.description.trim()) errs.description = t("error.required");
    if (!form.amount) errs.amount = t("error.required");
    if (!form.person_id) errs.person_id = t("error.required");
    if (form.person_id === "__new__" && !form.newPersonName.trim()) errs.newPersonName = t("error.required");
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setFormErrors({});
    let personId = form.person_id || null;
    if (form.person_id === "__new__" && form.newPersonName.trim()) {
      const created = await createPerson(form.newPersonName.trim(), "#94a3b8", 50);
      personId = created.id;
      setPeople(prev => [...prev, created]);
    }
    await createDebt({
      description: form.description,
      amount: parseFloat(form.amount),
      type: form.type,
      person_id: personId,
      due_date: form.due_date || null,
    });
    setForm({ description: "", amount: "", type: "i_owe", person_id: "", newPersonName: "", due_date: "" });
    setShowForm(false);
    setDebts(await fetchDebts());
  }

  async function handleAddPayment(e, debtId) {
    e.preventDefault();
    if (!paymentForm.amount) return;
    const debt = debts.find(d => d.id === debtId);
    if (debt) {
      const alreadyPaid = (debt.debt_payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
      const remaining = Math.max(0, (debt.amount ?? 0) - alreadyPaid);
      if (parseFloat(paymentForm.amount) > remaining) {
        setPaymentError(t("debt.paymentExceedsRemaining").replace("{remaining}", fmt(remaining, locale, currency)));
        return;
      }
    }
    setPaymentError("");
    setAddingPayment(null);
    setPaymentForm({ amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
    setSavingPayments(prev => new Set(prev).add(debtId));
    await createDebtPayment(debtId, {
      amount: parseFloat(paymentForm.amount),
      date: paymentForm.date,
      note: paymentForm.note || undefined,
    });
    setDebts(await fetchDebts());
    setSavingPayments(prev => { const s = new Set(prev); s.delete(debtId); return s; });
  }

  async function handleDeletePayment(debtId, paymentId) {
    await deleteDebtPayment(debtId, paymentId);
    setDebts(await fetchDebts());
  }

  async function handleDeleteDebt(debtId) {
    await deleteDebt(debtId);
    setConfirmDeleteDebt(null);
    setDebts(await fetchDebts());
  }

  async function handleBulkPayment(e) {
    e.preventDefault();
    if (!bulkForm.amount) return;
    const items = debtTab === "i_owe" ? iOwe : owedMe;
    const active = items.filter(d => {
      const paid = (d.debt_payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
      return Math.max(0, (d.amount ?? 0) - paid) > 0;
    });
    if (active.length === 0) return;
    const { amount, date, note } = bulkForm;
    setShowBulkForm(false);
    setBulkForm({ amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
    setSavingPayments(new Set(active.map(d => d.id)));
    await distributePayment({ type: debtTab, amount: parseFloat(amount), date, note: note || undefined });
    setDebts(await fetchDebts());
    setSavingPayments(new Set());
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  const PAID_COLOR = "#34d399";
  const UNPAID_COLOR = "#f87171";
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500";

  const renderDebtCard = (d, index) => {
    const payments = d.debt_payments ?? [];
    const paid = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const remaining = Math.max(0, (d.amount ?? 0) - paid);
    const pct = d.amount > 0 ? Math.min(100, (paid / d.amount) * 100) : 0;
const person = people.find(p => p.id === d.person_id);

    return (
      <div key={d.id} className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
        {/* Header: label + name + donut */}
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 tracking-widest uppercase">
                {t("debt.loanLabel")}{index}
                {person && <span className="ml-1.5">· {person.name}</span>}
              </div>
              <button onClick={() => setConfirmDeleteDebt(d)}
                className="text-slate-300 dark:text-zinc-600 hover:text-red-400 dark:hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-zinc-50 mt-1 leading-tight">{d.description}</div>
            {d.due_date && (
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-1">Due {d.due_date}</div>
            )}
          </div>
          <div className="relative w-[110px] h-[110px] shrink-0">
            <LoanDonut pct={pct} color={PAID_COLOR} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-zinc-50">{Math.round(pct)}%</div>
              <div className="text-[9px] text-slate-400 dark:text-zinc-500">{t("debt.paidLabel")}</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t("col.cantidad"), value: fmtShort(d.amount || 0), color: "#e4e4e7" },
            { label: t("summary.paid"),  value: fmtShort(paid),          color: PAID_COLOR },
            { label: t("debt.left"),     value: fmtShort(remaining),     color: UNPAID_COLOR },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 tracking-widest uppercase">{label}</div>
              <div className="text-sm font-bold font-mono mt-0.5" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Payment history */}
        <div>
          <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 tracking-widest uppercase mb-2">{t("debt.history")}</div>
          <div className="flex flex-col gap-1.5">
            {payments.length === 0 ? (
              <div className="text-xs text-slate-400 dark:text-zinc-600 italic">{t("debt.noPayments")}</div>
            ) : payments.map(pay => (
              <div key={pay.id} className="flex items-center gap-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PAID_COLOR }} />
                <span className="flex-1 text-slate-700 dark:text-zinc-300">
                  {t("debt.payment")} · {fmtPayDate(pay.date)}{pay.note ? ` · ${pay.note}` : ""}
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">{fmt(pay.amount, locale, currency)}</span>
                <button onClick={() => handleDeletePayment(d.id, pay.id)}
                  className="text-slate-300 dark:text-zinc-600 hover:text-red-400 transition-colors ml-1">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add payment button */}
        {savingPayments.has(d.id) ? (
          <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-zinc-500">
            <Loader2 size={12} className="animate-spin" /> {t("sync.saving")}
          </span>
        ) : (
          <button onClick={() => { setAddingPayment(d.id); setPaymentForm({ amount: "", date: new Date().toISOString().slice(0, 10), note: "" }); setPaymentError(""); }}
            disabled={remaining === 0}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none">
            <Plus size={12} /> Add Payment
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden animate-fade-in" style={{ fontVariantNumeric: "tabular-nums" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-end">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("flujo.loans")}</div>
          <div className="text-lg font-bold text-slate-900 dark:text-zinc-50 font-mono tracking-tight mt-1">{t("nav.debtKiller")}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBulkForm(v => !v)}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
            {t("debt.bulkPayment")}
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
            <Plus size={13} /> {t("debt.newDebt")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex gap-1 border-b border-slate-200 dark:border-zinc-800">
        {[
          { key: "owed_to_me", label: t("debt.owedToMe"), count: owedMe.length },
          { key: "i_owe",      label: t("debt.iOwe"),     count: iOwe.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setDebtTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold rounded-t-lg border-b-2 transition-colors",
              debtTab === tab.key
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
            )}>
            {tab.label}
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
              debtTab === tab.key
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500"
            )}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Debt cards */}
      <div className="p-4 pb-6 flex flex-col gap-4">
        {(() => {
          const isOwedToMe = debtTab === "owed_to_me";
          const items = isOwedToMe ? owedMe : iOwe;
          const { total, paid, remaining } = groupTotals(items);
          const kpis = isOwedToMe
            ? [
                { label: t("debt.totalToCollect"), value: fmt(total, locale, currency),     color: "#e4e4e7",   sub: `${items.length} ${t("debt.activeLoans")}` },
                { label: t("debt.collected"),      value: fmt(paid, locale, currency),      color: PAID_COLOR,  sub: `${total > 0 ? Math.round(paid / total * 100) : 0}% ${t("debt.ofTotal")}` },
                { label: t("debt.toReceive"),      value: fmt(remaining, locale, currency), color: "#60a5fa",   sub: t("debt.toCollect") },
              ]
            : [
                { label: t("debt.totalDebt"), value: fmt(total, locale, currency),     color: UNPAID_COLOR, sub: `${items.length} ${t("debt.activeLoans")}` },
                { label: t("summary.paid"),   value: fmt(paid, locale, currency),      color: PAID_COLOR,   sub: `${total > 0 ? Math.round(paid / total * 100) : 0}% ${t("debt.ofTotal")}` },
                { label: t("flujo.restante"), value: fmt(remaining, locale, currency), color: UNPAID_COLOR, sub: t("debt.toCollect") },
              ];
          return (
            <>
              <div className="grid grid-cols-3 gap-3">
                {kpis.map(k => (
                  <div key={k.label} className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl p-4">
                    <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{k.label}</div>
                    <div className="text-lg font-bold font-mono mt-1.5" style={{ color: k.color }}>{k.value}</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1">{k.sub}</div>
                  </div>
                ))}
              </div>
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 dark:text-zinc-500 text-sm">{t("debt.noLoans")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((d, i) => renderDebtCard(d, i + 1))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Modal: New Debt */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setShowForm(false); setFormErrors({}); }}>
          <form onSubmit={handleCreate} onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col gap-3 shadow-xl">
            <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("debt.newDebt")}</div>
            <div>
              <input placeholder={t("debt.description")} value={form.description}
                onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setFormErrors(fe => ({ ...fe, description: "" })); }}
                className={inputCls + (formErrors.description ? " border-red-400 focus:ring-red-400" : "")} />
              {formErrors.description && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.description}</p>}
            </div>
            <div>
              {formAmountFocused ? (
                <input type="number" min="0" step="any" autoFocus value={form.amount || ""}
                  onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setFormErrors(fe => ({ ...fe, amount: "" })); }}
                  onBlur={() => setFormAmountFocused(false)}
                  className={inputCls + " font-mono text-right" + (formErrors.amount ? " border-red-400 focus:ring-red-400" : "")} />
              ) : (
                <input readOnly value={form.amount === "" ? "" : fmt(parseFloat(form.amount) || 0, locale, currency)}
                  onFocus={() => setFormAmountFocused(true)}
                  placeholder="0" className={inputCls + " font-mono text-right cursor-text" + (formErrors.amount ? " border-red-400" : "")} />
              )}
              {formErrors.amount && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.amount}</p>}
            </div>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
              <option value="i_owe">{t("debt.iOwe")}</option>
              <option value="owed_to_me">{t("debt.owedToMe")}</option>
            </select>
            <div>
              <select value={form.person_id} onChange={e => { setForm(f => ({ ...f, person_id: e.target.value, newPersonName: "" })); setFormErrors(fe => ({ ...fe, person_id: "", newPersonName: "" })); }}
                className={inputCls + (formErrors.person_id ? " border-red-400 focus:ring-red-400" : "")}>
                <option value="" disabled>{t("debt.selectPerson")}</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="__new__">{t("debt.newPerson")}</option>
              </select>
              {formErrors.person_id && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.person_id}</p>}
            </div>
            {form.person_id === "__new__" && (
              <div>
                <input autoFocus placeholder={t("debt.personName")} value={form.newPersonName}
                  onChange={e => { setForm(f => ({ ...f, newPersonName: e.target.value })); setFormErrors(fe => ({ ...fe, newPersonName: "" })); }}
                  className={inputCls + (formErrors.newPersonName ? " border-red-400 focus:ring-red-400" : "")} />
                {formErrors.newPersonName && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.newPersonName}</p>}
              </div>
            )}
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inputCls} />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">{t("btn.save")}</button>
              <button type="button" onClick={() => { setShowForm(false); setFormErrors({}); }}
                className="flex-1 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">{t("btn.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Payment */}
      {addingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setAddingPayment(null)}>
          <form onSubmit={e => handleAddPayment(e, addingPayment)} onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col gap-3 shadow-xl">
            <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("debt.addPayment")}</div>
            {paymentAmountFocused ? (
              <input required type="number" min="0" step="any" autoFocus value={paymentForm.amount || ""}
                onChange={e => { setPaymentForm(f => ({ ...f, amount: e.target.value })); setPaymentError(""); }}
                onBlur={() => setPaymentAmountFocused(false)}
                className={inputCls + " font-mono text-right" + (paymentError ? " border-red-400 focus:ring-red-400" : "")} />
            ) : (
              <input readOnly value={paymentForm.amount === "" ? "" : fmt(parseFloat(paymentForm.amount) || 0, locale, currency)}
                onFocus={() => setPaymentAmountFocused(true)}
                placeholder="0" className={inputCls + " font-mono text-right cursor-text" + (paymentError ? " border-red-400" : "")} />
            )}
            {paymentError && (
              <p className="text-xs text-red-500 dark:text-red-400 -mt-1">{paymentError}</p>
            )}
            <input type="date" value={paymentForm.date}
              onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
            <input placeholder={t("debt.noteOptional")} value={paymentForm.note}
              onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))} className={inputCls} />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">{t("btn.save")}</button>
              <button type="button" onClick={() => setAddingPayment(null)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">{t("btn.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Bulk Payment */}
      {showBulkForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowBulkForm(false)}>
          <form onSubmit={handleBulkPayment} onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col gap-3 shadow-xl">
            <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("debt.bulkPaymentTitle")}</div>
            {bulkAmountFocused ? (
              <input required type="number" min="0" step="any" autoFocus value={bulkForm.amount || ""}
                onChange={e => setBulkForm(f => ({ ...f, amount: e.target.value }))}
                onBlur={() => setBulkAmountFocused(false)}
                className={inputCls + " font-mono text-right"} />
            ) : (
              <input readOnly value={bulkForm.amount === "" ? "" : fmt(parseFloat(bulkForm.amount) || 0, locale, currency)}
                onFocus={() => setBulkAmountFocused(true)}
                placeholder="0" className={inputCls + " font-mono text-right cursor-text"} />
            )}
            <input type="date" value={bulkForm.date}
              onChange={e => setBulkForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
            <input placeholder={t("debt.noteOptional")} value={bulkForm.note}
              onChange={e => setBulkForm(f => ({ ...f, note: e.target.value }))} className={inputCls} />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">{t("btn.save")}</button>
              <button type="button" onClick={() => setShowBulkForm(false)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">{t("btn.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Confirm Delete Debt */}
      {confirmDeleteDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmDeleteDebt(null)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("expense.deleteTitle")}</div>
            <p className="text-sm text-slate-700 dark:text-zinc-300">
              {t("expense.deleteDesc").replace("{name}", confirmDeleteDebt.description)}
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleDeleteDebt(confirmDeleteDebt.id)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">{t("btn.delete")}</button>
              <button onClick={() => setConfirmDeleteDebt(null)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">{t("btn.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
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
