import { useState, useEffect, Fragment } from "react";
import { Plus, Trash2, Cloud } from "lucide-react";
import { useI18n } from "../../i18n/index.jsx";
import { cn, toMonthKey, toDateKey, fmt } from "../../lib/utils.js";
import {
  fetchCategories, fetchTransactions, createTransaction, updateTransaction,
  createCategory,
  deleteTransaction as deleteTransactionApi,
} from "../../api.js";
import Modal from "../../components/Modal.jsx";
import Btn from "../../components/Btn.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import RowActions from "../../components/RowActions.jsx";
import AmountInput from "../../components/AmountInput.jsx";
import { TONE, TYPE } from "../../lib/tokens.js";

const INPUT = "w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition";

// Parse a YYYY-MM-DD string into a local Date (no UTC shift).
const parseDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export default function Transactions() {
  const { t, locale, currency, lang } = useI18n();
  const today = new Date();
  const todayKey = toDateKey(today);

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewDate, setViewDate] = useState(today);
  const [editing, setEditing] = useState(null); // null | full row draft
  const [pendingDelete, setPendingDelete] = useState(null); // null | { id, note }
  const [newCategory, setNewCategory] = useState(null); // null | string
  const emptyDraft = { date: todayKey, amount: 0, category_id: "", note: "", method: "" };
  const [draft, setDraft] = useState(emptyDraft);

  const monthKey = toMonthKey(viewDate);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCategories("transaction"),
      fetchTransactions(monthKey),
    ]).then(([cats, txs]) => {
      setCategories(cats);
      setTransactions(txs);
      setLoading(false);
    }).catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  }, [monthKey]);

  const catName = (id) => categories.find((c) => c.id === id)?.name ?? "—";

  const grandTotal = transactions.reduce((s, e) => s + (e.amount || 0), 0);

  // Group by date desc; rows already arrive date desc / created_at desc.
  const byDay = [];
  for (const tx of transactions) {
    let g = byDay.find((x) => x.date === tx.date);
    if (!g) { g = { date: tx.date, items: [] }; byDay.push(g); }
    g.items.push(tx);
  }

  const dayLabel = (d) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-CO", {
      weekday: "short", day: "numeric", month: "short",
    }).format(parseDate(d));

  const handleAdd = async () => {
    if (!draft.category_id || !draft.amount) return;
    const payload = {
      date: draft.date || todayKey,
      amount: draft.amount,
      category_id: draft.category_id,
      note: draft.note.trim() || null,
      method: draft.method.trim() || null,
    };
    try {
      const created = await createTransaction(payload);
      setTransactions((xs) => [created, ...xs].sort(sortRows));
      // Keep date + category for fast repeated entry; clear amount + note.
      setDraft((p) => ({ ...p, amount: 0, note: "" }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCategory = async () => {
    const name = (newCategory || "").trim();
    if (!name) return;
    setNewCategory(null);
    try {
      const cat = await createCategory("transaction", name);
      setCategories((xs) => [...xs, cat]);
      setDraft((p) => ({ ...p, category_id: cat.id }));
    } catch (e) {
      console.error(e);
    }
  };

  const saveEditing = async () => {
    if (!editing) return;
    const prev = transactions.find((e) => e.id === editing.id);
    const patch = {
      date: editing.date,
      amount: editing.amount,
      category_id: editing.category_id,
      note: editing.note?.trim() || null,
      method: editing.method?.trim() || null,
    };
    setTransactions((xs) => xs.map((e) => e.id === editing.id ? { ...e, ...patch } : e).sort(sortRows));
    setEditing(null);
    try {
      await updateTransaction(prev.id, patch);
    } catch {
      setTransactions((xs) => xs.map((e) => e.id === prev.id ? prev : e).sort(sortRows));
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    setTransactions((xs) => xs.filter((e) => e.id !== id));
    try {
      await deleteTransactionApi(id);
    } catch (e) {
      console.error(e);
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

  const noCategories = categories.length === 0;

  return (
    <div className="animate-fade-in space-y-2" style={{ fontVariantNumeric: "tabular-nums" }}>
      <PageHeader
        viewDate={viewDate} onSelectMonth={setViewDate}
        title={t("transactions.title")}
        meta={`${transactions.length} ${t("transactions.count")}`}
        metrics={[
          { label: t("transactions.total"), value: fmt(grandTotal, locale, currency), tone: "neutral" },
        ]}
      />

      {/* Inline quick-add row */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
            className={cn(INPUT, "w-auto")}
          />
          <select
            value={draft.category_id}
            onChange={(e) => {
              if (e.target.value === "__new__") { setNewCategory(""); return; }
              setDraft((p) => ({ ...p, category_id: e.target.value }));
            }}
            className={cn(INPUT, "w-auto min-w-[9rem]")}
          >
            <option value="">{t("transactions.category")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__new__">+ {t("transactions.newCategory")}</option>
          </select>
          <AmountInput
            value={draft.amount}
            onChange={(v) => setDraft((p) => ({ ...p, amount: v }))}
            onEnter={handleAdd}
            format={(n) => fmt(n, locale, currency)}
            placeholder={t("transactions.amount")}
            className="w-32"
          />
          <input
            type="text" placeholder={t("transactions.note")}
            value={draft.note}
            onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className={cn(INPUT, "flex-1 min-w-[8rem]")}
          />
          <input
            type="text" placeholder={t("transactions.method")}
            value={draft.method}
            onChange={(e) => setDraft((p) => ({ ...p, method: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className={cn(INPUT, "w-32")}
          />
          <Btn variant="primary" size="md" onClick={handleAdd} disabled={!draft.category_id || !draft.amount}>
            <Plus size={15} /> {t("transactions.add")}
          </Btn>
        </div>
        {noCategories && (
          <p className="mt-2 text-xs font-mono text-slate-400 dark:text-zinc-500">{t("transactions.noCategories")}</p>
        )}
      </div>

      {/* Ledger grouped by day */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <tbody>
              {byDay.length === 0 && (
                <tr><td className="py-10 text-center text-slate-400 dark:text-zinc-500">{t("transactions.empty")}</td></tr>
              )}
              {byDay.map((g) => {
                const dayTotal = g.items.reduce((s, e) => s + (e.amount || 0), 0);
                return (
                  <Fragment key={g.date}>
                    <tr className="border-t-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/40">
                      <td className="py-2 px-3 font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider">{dayLabel(g.date)}</td>
                      <td className="py-2 px-3 text-right text-slate-500 dark:text-zinc-400">{fmt(dayTotal, locale, currency)}</td>
                      <td className="w-10" />
                    </tr>
                    {g.items.map((e, i) => (
                      <tr
                        key={e.id}
                        onClick={() => setEditing({ ...e, note: e.note ?? "", method: e.method ?? "" })}
                        className={cn(
                          "border-b border-slate-100 dark:border-zinc-800/60 transition-colors cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10",
                          i % 2 === 1 ? "bg-slate-50/50 dark:bg-zinc-800/30" : ""
                        )}>
                        <td className="py-1.5 px-3">
                          <span className="text-slate-700 dark:text-zinc-300">{catName(e.category_id)}</span>
                          {(e.note || e.method) && (
                            <span className="text-slate-400 dark:text-zinc-500">
                              {e.note ? ` · ${e.note}` : ""}{e.method ? ` · ${e.method}` : ""}
                            </span>
                          )}
                        </td>
                        <td className={cn("py-1.5 px-3 text-right font-semibold", TONE.neutral)}>
                          {fmt(e.amount, locale, currency)}
                        </td>
                        <td className="py-1.5 px-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                          <RowActions items={[
                            { label: t("actions.delete"), icon: Trash2, tone: "danger", onClick: () => setPendingDelete({ id: e.id, note: e.note || catName(e.category_id) }) },
                          ]} />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t-2 border-slate-200 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50 font-mono">
          <div className={TYPE.label}>{t("transactions.total")}</div>
          <div className="text-xl font-bold text-slate-900 dark:text-zinc-100 pr-12">{fmt(grandTotal, locale, currency)}</div>
        </div>
      </div>

      {/* New category modal */}
      <Modal open={newCategory !== null} onClose={() => setNewCategory(null)}
        title={t("transactions.newCategory")}
        actions={<>
          <Btn onClick={() => setNewCategory(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleCreateCategory}>{t("btn.save")}</Btn>
        </>}
      >
        <input
          type="text" autoFocus
          value={newCategory ?? ""}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
          className={INPUT}
        />
      </Modal>

      {/* Delete modal */}
      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)}
        title={t("transactions.deleteTitle")}
        description={t("transactions.deleteDesc").replace("{name}", pendingDelete?.note ?? "")}
        actions={<>
          <Btn onClick={() => setPendingDelete(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="danger" size="md" onClick={handleDelete}>{t("btn.delete")}</Btn>
        </>}
      />

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)}
        title={t("transactions.editTitle")}
        actions={<>
          <Btn onClick={() => setEditing(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={saveEditing}>{t("btn.save")}</Btn>
        </>}
      >
        {editing && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("transactions.date")}</label>
              <input type="date" value={editing.date} onChange={(e) => setEditing((p) => ({ ...p, date: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("transactions.category")}</label>
              <select value={editing.category_id} onChange={(e) => setEditing((p) => ({ ...p, category_id: e.target.value }))} className={INPUT}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("transactions.amount")}</label>
              <AmountInput
                value={editing.amount}
                onChange={(v) => setEditing((p) => ({ ...p, amount: v }))}
                onEnter={saveEditing}
                format={(n) => fmt(n, locale, currency)}
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("transactions.note")}</label>
              <input type="text" value={editing.note} onChange={(e) => setEditing((p) => ({ ...p, note: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("transactions.method")}</label>
              <input type="text" value={editing.method} onChange={(e) => setEditing((p) => ({ ...p, method: e.target.value }))} className={INPUT} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Sort date desc, then created_at desc so newest entries sit at the top of a day.
function sortRows(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.created_at || "") < (a.created_at || "") ? -1 : 1;
}
