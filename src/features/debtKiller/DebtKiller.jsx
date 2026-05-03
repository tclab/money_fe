import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Cloud, Pencil, Loader2, ImageDown } from "lucide-react";
import { useI18n } from "../../i18n/index.jsx";
import { cn, fmt } from "../../lib/utils.js";
import {
  fetchDebts, createDebt, deleteDebt, updateDebt, distributePayment,
  createDebtPayment, deleteDebtPayment,
  fetchPeople, createPerson,
} from "../../api.js";

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

export default function DebtKiller() {
  const { t, locale, currency, theme } = useI18n();
  const [debts, setDebts] = useState([]);
  const [availablePersons, setAvailablePersons] = useState([]);
  const [debtPersonFilter, setDebtPersonFilter] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportGenerating, setReportGenerating] = useState(false);
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
  const [bulkForm, setBulkForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), note: "", person_id: "" });
  const [bulkAmountFocused, setBulkAmountFocused] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [confirmDeleteDebt, setConfirmDeleteDebt] = useState(null);
  const [editingDebt, setEditingDebt] = useState(null);
  const [editAmountFocused, setEditAmountFocused] = useState(false);

  async function refreshDebts(personId = null) {
    const [filtered, all] = await Promise.all([
      fetchDebts({ personId: personId || undefined }),
      fetchDebts(),
    ]);
    setDebts(filtered);
    const type = debtTab === "owed_to_me" ? "owed_to_me" : "i_owe";
    const ids = [...new Set(all.filter(d => d.type === type).map(d => d.person_id).filter(Boolean))];
    setAvailablePersons(ids);
    if (debtPersonFilter && !ids.includes(debtPersonFilter)) setDebtPersonFilter(null);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDebts(), fetchPeople()])
      .then(([d, p]) => {
        setDebts(d);
        setPeople(p);
        const type = "owed_to_me";
        const ids = [...new Set(d.filter(x => x.type === type).map(x => x.person_id).filter(Boolean))];
        setAvailablePersons(ids);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setDebtPersonFilter(null);
    fetchDebts().then(all => {
      const type = debtTab === "owed_to_me" ? "owed_to_me" : "i_owe";
      const ids = [...new Set(all.filter(d => d.type === type).map(d => d.person_id).filter(Boolean))];
      setAvailablePersons(ids);
    });
  }, [debtTab]);

  useEffect(() => {
    fetchDebts({ personId: debtPersonFilter || undefined }).then(setDebts);
  }, [debtPersonFilter]);

  useEffect(() => {
    if (!reportTarget) return;
    (async () => {
      setReportGenerating(true);
      try {
        if (!window.html2canvas) {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          await new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.head.appendChild(script); });
        }
        await new Promise(r => setTimeout(r, 150));
        const bgColor = theme === "dark" ? "#18181b" : "#f8fafc";
        const canvas = await window.html2canvas(reportRef.current, { backgroundColor: bgColor, scale: 2 });
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `reporte-${(reportTarget.person?.name ?? debtTab).toLowerCase().replace(/\s+/g, "-")}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }, "image/png");
      } catch (e) {
        console.error("Report capture failed:", e);
      } finally {
        setReportTarget(null);
        setReportGenerating(false);
      }
    })();
  }, [reportTarget]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (addingPayment) setAddingPayment(null);
      else if (editingDebt) setEditingDebt(null);
      else if (confirmDeleteDebt) setConfirmDeleteDebt(null);
      else if (showBulkForm) closeBulkForm();
      else if (showForm) { setShowForm(false); setFormErrors({}); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, addingPayment, showBulkForm, confirmDeleteDebt, editingDebt]);

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
    await refreshDebts(debtPersonFilter);
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
    await refreshDebts(debtPersonFilter);
    setSavingPayments(prev => { const s = new Set(prev); s.delete(debtId); return s; });
  }

  async function handleDeletePayment(debtId, paymentId) {
    await deleteDebtPayment(debtId, paymentId);
    await refreshDebts(debtPersonFilter);
  }

  async function handleDeleteDebt(debtId) {
    await deleteDebt(debtId);
    setConfirmDeleteDebt(null);
    await refreshDebts(debtPersonFilter);
  }

  async function handleUpdateDebt() {
    if (!editingDebt) return;
    const patch = {
      description: editingDebt.description,
      amount: parseFloat(editingDebt.amount),
      person_id: editingDebt.person_id || null,
      due_date: editingDebt.due_date || null,
    };
    setEditingDebt(null);
    await updateDebt(editingDebt.id, patch);
    await refreshDebts(debtPersonFilter);
  }

  function handleReport() {
    const person = debtPersonFilter ? people.find(p => p.id === debtPersonFilter) : null;
    setReportTarget({ person, debts });
  }

  function closeBulkForm() {
    setShowBulkForm(false);
    setBulkError("");
    setBulkForm({ amount: "", date: new Date().toISOString().slice(0, 10), note: "", person_id: "" });
  }

  async function handleBulkPayment(e) {
    e.preventDefault();
    if (!bulkForm.amount) return;
    const items = debtTab === "i_owe" ? iOwe : owedMe;
    const active = items.filter(d => {
      if (bulkForm.person_id && d.person_id !== bulkForm.person_id) return false;
      const paid = (d.debt_payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
      return Math.max(0, (d.amount ?? 0) - paid) > 0;
    });
    if (active.length === 0) {
      setBulkError(t("debt.noActive"));
      return;
    }
    const totalRemaining = active.reduce((s, d) => {
      const paid = (d.debt_payments ?? []).reduce((ps, p) => ps + (p.amount ?? 0), 0);
      return s + Math.max(0, (d.amount ?? 0) - paid);
    }, 0);
    const parsedAmount = parseFloat(bulkForm.amount);
    if (parsedAmount > totalRemaining) {
      setBulkError(t("debt.paymentExceedsRemaining").replace("{remaining}", fmt(totalRemaining, locale, currency)));
      return;
    }
    const { amount, date, note, person_id } = bulkForm;
    closeBulkForm();
    setSavingPayments(new Set(active.map(d => d.id)));
    await distributePayment({ type: debtTab, amount: parsedAmount, date, note: note || undefined, person_id: person_id || undefined });
    await refreshDebts(debtPersonFilter);
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setEditingDebt({ id: d.id, description: d.description ?? "", amount: String(d.amount ?? ""), person_id: d.person_id ?? "", due_date: d.due_date ?? "" })}
                  className="text-slate-300 dark:text-zinc-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setConfirmDeleteDebt(d)}
                  className="text-slate-300 dark:text-zinc-600 hover:text-red-400 dark:hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
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
          <button onClick={handleReport} disabled={reportGenerating || debts.length === 0}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40">
            <ImageDown size={13} /> {reportGenerating ? "..." : t("debt.report")}
          </button>
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

      {/* Person filter pills */}
      {availablePersons.length > 1 && (
        <div className="flex gap-2 flex-wrap px-4 pt-3">
          <button onClick={() => setDebtPersonFilter(null)}
            className={cn("text-xs font-mono px-3 py-1 rounded-full border transition-colors",
              !debtPersonFilter
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                : "border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
            )}>
            {t("btn.all")}
          </button>
          {availablePersons.map(pid => {
            const person = people.find(p => p.id === pid);
            if (!person) return null;
            return (
              <button key={pid} onClick={() => setDebtPersonFilter(pid)}
                className={cn("text-xs font-mono px-3 py-1 rounded-full border transition-colors",
                  debtPersonFilter === pid
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                    : "border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                )}>
                {person.name}
              </button>
            );
          })}
        </div>
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeBulkForm}>
          <form onSubmit={handleBulkPayment} onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col gap-3 shadow-xl">
            <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("debt.bulkPaymentTitle")}</div>
            {bulkAmountFocused ? (
              <input required type="number" min="0" step="any" autoFocus value={bulkForm.amount || ""}
                onChange={e => { setBulkError(""); setBulkForm(f => ({ ...f, amount: e.target.value })); }}
                onBlur={() => setBulkAmountFocused(false)}
                className={inputCls + " font-mono text-right"} />
            ) : (
              <input readOnly value={bulkForm.amount === "" ? "" : fmt(parseFloat(bulkForm.amount) || 0, locale, currency)}
                onFocus={() => setBulkAmountFocused(true)}
                placeholder="0" className={inputCls + " font-mono text-right cursor-text"} />
            )}
            {bulkError && <p className="text-xs text-red-500">{bulkError}</p>}
            <input type="date" value={bulkForm.date}
              onChange={e => setBulkForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
            {people.length > 0 && (
              <select value={bulkForm.person_id} onChange={e => { setBulkError(""); setBulkForm(f => ({ ...f, person_id: e.target.value })); }} className={inputCls}>
                <option value="">{t("debt.personOptional")}</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <input placeholder={t("debt.noteOptional")} value={bulkForm.note}
              onChange={e => setBulkForm(f => ({ ...f, note: e.target.value }))} className={inputCls} />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">{t("btn.save")}</button>
              <button type="button" onClick={closeBulkForm}
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

      {/* Modal: Edit Debt */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditingDebt(null)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col gap-3 shadow-xl">
            <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase">{t("debt.editDebt")}</div>
            <input
              placeholder={t("debt.description")}
              value={editingDebt.description}
              onChange={e => setEditingDebt(v => ({ ...v, description: e.target.value }))}
              className={inputCls}
            />
            {editAmountFocused ? (
              <input type="number" min="0" step="any" autoFocus
                value={editingDebt.amount}
                onChange={e => setEditingDebt(v => ({ ...v, amount: e.target.value }))}
                onBlur={() => setEditAmountFocused(false)}
                className={inputCls + " font-mono text-right"} />
            ) : (
              <button type="button" onClick={() => setEditAmountFocused(true)}
                className={inputCls + " font-mono text-right"}>
                {editingDebt.amount ? fmt(parseFloat(editingDebt.amount), locale, currency) : <span className="text-slate-400 text-left block">0</span>}
              </button>
            )}
            <select value={editingDebt.person_id}
              onChange={e => setEditingDebt(v => ({ ...v, person_id: e.target.value }))}
              className={inputCls}>
              <option value="">{t("debt.personOptional")}</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" value={editingDebt.due_date}
              onChange={e => setEditingDebt(v => ({ ...v, due_date: e.target.value }))}
              className={inputCls + " font-mono"} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingDebt(null)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">{t("btn.cancel")}</button>
              <button onClick={handleUpdateDebt}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">{t("btn.save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden off-screen report div for html2canvas capture */}
      {reportTarget && (() => {
        const isDark = theme === "dark";
        const rp = isDark
          ? { bg: "#18181b", card: "#27272a", row: "#1f1f23", border: "#3f3f46", text: "#f4f4f5", muted: "#71717a", sub: "#52525b" }
          : { bg: "#f8fafc", card: "#ffffff",  row: "#f1f5f9", border: "#e2e8f0", text: "#0f172a", muted: "#94a3b8", sub: "#cbd5e1" };
        const { total, paid: totalPaid, remaining: totalRem } = groupTotals(reportTarget.debts);
        const overallPct = total > 0 ? Math.round(totalPaid / total * 100) : 0;
        return (
          <div ref={reportRef} style={{ position: "fixed", top: -9999, left: -9999, width: 600, background: rp.bg, padding: 24, fontFamily: "ui-monospace, monospace" }}>
            <div style={{ color: rp.muted, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              {reportTarget.person ? reportTarget.person.name : t(debtTab === "owed_to_me" ? "debt.owedToMe" : "debt.iOwe")} · {new Date().toLocaleDateString()}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: t("debt.totalToCollect"), value: fmt(total, locale, currency),     color: isDark ? "#e4e4e7" : "#0f172a", sub: `${reportTarget.debts.length} ${t("debt.activeLoans")}` },
                { label: t("debt.collected"),      value: fmt(totalPaid, locale, currency), color: "#34d399", sub: `${overallPct}% ${t("debt.ofTotal")}` },
                { label: t("debt.toReceive"),      value: fmt(totalRem, locale, currency),  color: "#60a5fa", sub: t("debt.toCollect") },
              ].map(k => (
                <div key={k.label} style={{ background: rp.card, borderRadius: 12, padding: "12px 16px", border: `1px solid ${rp.border}` }}>
                  <div style={{ color: rp.muted, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>{k.label}</div>
                  <div style={{ color: k.color, fontSize: 18, fontWeight: 700, marginTop: 6 }}>{k.value}</div>
                  <div style={{ color: rp.sub, fontSize: 9, marginTop: 4 }}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {reportTarget.debts.map((d, i) => {
                const payments = d.debt_payments ?? [];
                const paidAmt = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
                const rem = Math.max(0, (d.amount ?? 0) - paidAmt);
                const pct = d.amount > 0 ? Math.min(100, (paidAmt / d.amount) * 100) : 0;
                const r = 44, cx = 55, cy = 55, sw = 8, circ = 2 * Math.PI * r;
                return (
                  <div key={d.id} style={{ background: rp.card, border: `1px solid ${rp.border}`, borderRadius: 16, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ color: rp.muted, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          {t("debt.loanLabel")}{i + 1}{reportTarget.person ? ` · ${reportTarget.person.name.toUpperCase()}` : ""}
                        </div>
                        <div style={{ color: rp.text, fontSize: 18, fontWeight: 700, marginTop: 4 }}>{d.description}</div>
                      </div>
                      <svg width={110} height={110} style={{ flexShrink: 0 }}>
                        <g transform={`rotate(-90 ${cx} ${cy})`}>
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke={rp.border} strokeWidth={sw} />
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#34d399" strokeWidth={sw}
                            strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round" />
                        </g>
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                          style={{ fill: rp.text, fontSize: 14, fontWeight: 700 }}>
                          {Math.round(pct)}%
                        </text>
                        <text x={cx} y={cy + 14} textAnchor="middle"
                          style={{ fill: rp.muted, fontSize: 8 }}>
                          {t("debt.paidLabel")}
                        </text>
                      </svg>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                      {[
                        { label: t("col.cantidad"), value: fmtShort(d.amount || 0), color: isDark ? "#e4e4e7" : "#0f172a" },
                        { label: t("summary.paid"),  value: fmtShort(paidAmt),       color: "#34d399" },
                        { label: t("debt.left"),     value: fmtShort(rem),           color: "#f87171" },
                      ].map(s => (
                        <div key={s.label}>
                          <div style={{ color: rp.muted, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.label}</div>
                          <div style={{ color: s.color, fontSize: 13, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ color: rp.muted, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{t("debt.history")}</div>
                    {payments.map(pay => (
                      <div key={pay.id} style={{ background: rp.row, borderRadius: 8, padding: "6px 12px", marginBottom: 4, fontSize: 11, lineHeight: "20px" }}>
                        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#34d399", verticalAlign: "middle", marginRight: 8 }} />
                        <span style={{ color: isDark ? "#d4d4d8" : "#334155", verticalAlign: "middle" }}>{t("debt.payment")} · {fmtPayDate(pay.date)}{pay.note ? ` · ${pay.note}` : ""}</span>
                        <span style={{ color: rp.text, fontWeight: 600, float: "right", verticalAlign: "middle" }}>{fmt(pay.amount, locale, currency)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
