import { useState, useEffect, Fragment } from "react";
import { Plus, Trash2, Receipt, Pencil, Tags } from "lucide-react";
import { useI18n } from "../../i18n/index.jsx";
import { cn, toMonthKey, toDateKey, fmt, catColor } from "../../lib/utils.js";
import {
  fetchCategories, fetchTransactions, createTransaction, updateTransaction,
  createCategory, updateCategory, deleteCategory as deleteCategoryApi,
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

const Dot = ({ id }) => (
  id
    ? <span style={{ background: catColor(id) }} className="inline-block w-2 h-2 rounded-full shrink-0" />
    : <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-slate-300 dark:bg-zinc-600" />
);

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
  const [pendingDelete, setPendingDelete] = useState(null); // null | { id, note, amount, category_id }
  const [newCategory, setNewCategory] = useState(null); // null | string
  const [manageOpen, setManageOpen] = useState(false); // category manager modal
  const [editingCategory, setEditingCategory] = useState(null); // null | { id, name }
  const [editCategoryErr, setEditCategoryErr] = useState(false);
  const [pendingCatDelete, setPendingCatDelete] = useState(null); // null | { id, name }
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

  const catName = (id) => categories.find((c) => c.id === id)?.name ?? t("transactions.uncategorized");

  const grandTotal = transactions.reduce((s, e) => s + (e.amount || 0), 0);

  // Group by date desc; rows already arrive date desc / created_at desc.
  const byDay = [];
  for (const tx of transactions) {
    let g = byDay.find((x) => x.date === tx.date);
    if (!g) { g = { date: tx.date, items: [] }; byDay.push(g); }
    g.items.push(tx);
  }
  const dayCount = byDay.length || 1;

  const dayLabel = (d) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-CO", {
      weekday: "short", day: "numeric", month: "short",
    }).format(parseDate(d));

  const handleAdd = async () => {
    if (!draft.amount) return;
    const payload = {
      date: draft.date || todayKey,
      amount: draft.amount,
      category_id: draft.category_id || null,
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
    // Reuse an existing category instead of creating a case-insensitive duplicate.
    const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (match) {
      setDraft((p) => ({ ...p, category_id: match.id }));
      setNewCategory(null);
      return;
    }
    setNewCategory(null);
    try {
      const cat = await createCategory("transaction", name);
      setCategories((xs) => xs.some((c) => c.id === cat.id) ? xs : [...xs, cat]);
      setDraft((p) => ({ ...p, category_id: cat.id }));
    } catch (e) {
      console.error(e);
    }
  };

  const saveEditingCategory = async () => {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    if (!name) return;
    // Block renaming onto another existing category (case-insensitive).
    const dup = categories.some((c) => c.id !== editingCategory.id && c.name.toLowerCase() === name.toLowerCase());
    if (dup) { setEditCategoryErr(true); return; }
    const prev = categories.find((c) => c.id === editingCategory.id);
    setCategories((xs) => xs.map((c) => c.id === editingCategory.id ? { ...c, name } : c));
    setEditingCategory(null);
    setEditCategoryErr(false);
    try {
      await updateCategory("transaction", editingCategory.id, name);
    } catch {
      setCategories((xs) => xs.map((c) => c.id === prev.id ? prev : c));
    }
  };

  const handleDeleteCategory = async () => {
    if (!pendingCatDelete) return;
    const { id } = pendingCatDelete;
    setPendingCatDelete(null);
    setCategories((xs) => xs.filter((c) => c.id !== id));
    setTransactions((xs) => xs.filter((e) => e.category_id !== id));
    if (draft.category_id === id) setDraft((p) => ({ ...p, category_id: "" }));
    try {
      await deleteCategoryApi("transaction", id);
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
      category_id: editing.category_id || null,
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
        meta={`${transactions.length} ${t("transactions.count")} · ${byDay.length} ${t("transactions.days")}`}
        metrics={[
          { label: t("transactions.total"), value: fmt(grandTotal, locale, currency), tone: "neutral" },
          { label: t("transactions.perDay"), value: fmt(grandTotal / dayCount, locale, currency), tone: "neutral" },
        ]}
        action={
          <Btn variant="primary" size="md" onClick={() => setManageOpen(true)}>
            <Tags size={15} /> {t("transactions.manageCategories")}
          </Btn>
        }
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
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Dot id={draft.category_id} />
            </span>
            <select
              value={draft.category_id}
              onChange={(e) => {
                if (e.target.value === "__new__") { setNewCategory(""); return; }
                setDraft((p) => ({ ...p, category_id: e.target.value }));
              }}
              className={cn(INPUT, "w-auto min-w-[9rem] pl-7")}
            >
              <option value="">{t("transactions.uncategorized")}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ {t("transactions.newCategory")}</option>
            </select>
          </div>
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
          <Btn variant="primary" size="md" onClick={handleAdd} disabled={!draft.amount}>
            <Plus size={15} /> {t("transactions.add")}
          </Btn>
        </div>
        {noCategories ? (
          <p className="mt-2 text-xs font-mono text-slate-400 dark:text-zinc-500">{t("transactions.noCategories")}</p>
        ) : (
          <p className="mt-2 px-1 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-600 hidden sm:block">{t("transactions.enterHint")}</p>
        )}
      </div>

      {/* Ledger grouped by day */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {/* Column header */}
        <div className="flex items-center px-3 py-2 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40 font-mono">
          <span className={cn(TYPE.label, "flex-1")}>{t("transactions.category")}</span>
          <span className={cn(TYPE.label, "text-right w-28 sm:w-36")}>{t("transactions.amount")}</span>
        </div>

        {loading ? (
          <LoadingRows />
        ) : byDay.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 py-16 px-6">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500">
              <Receipt size={22} />
            </div>
            <div className="text-sm font-mono font-bold text-slate-700 dark:text-zinc-200 mt-1">{t("transactions.empty")}</div>
            <div className="text-xs font-sans text-slate-400 dark:text-zinc-500 max-w-[260px]">{t("transactions.emptyHint")}</div>
          </div>
        ) : (
          <div className="font-mono text-xs">
            {byDay.map((g) => {
              const dayTotal = g.items.reduce((s, e) => s + (e.amount || 0), 0);
              return (
                <Fragment key={g.date}>
                  <div className="flex items-center px-3 py-2 border-b border-slate-200 dark:border-zinc-700 bg-slate-200/70 dark:bg-zinc-700/60">
                    <span className="flex-1 font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-wider">{dayLabel(g.date)}</span>
                    <span className="text-right w-28 sm:w-36 font-semibold text-slate-400 dark:text-zinc-500">{fmt(dayTotal, locale, currency)}</span>
                  </div>
                  {g.items.map((e, i) => (
                    <div
                      key={e.id}
                      onClick={() => setEditing({ ...e, note: e.note ?? "", method: e.method ?? "" })}
                      className={cn(
                        "group flex items-center px-3 py-2 border-b border-slate-100 dark:border-zinc-800/60 transition-colors cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10",
                        i % 2 === 1 ? "bg-slate-50/50 dark:bg-zinc-800/30" : ""
                      )}
                    >
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setPendingDelete({ id: e.id, note: e.note, amount: e.amount, category_id: e.category_id }); }}
                          className="inline-flex items-center justify-center w-4 h-4 rounded text-slate-300 dark:text-zinc-600 hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                        <Dot id={e.category_id} />
                        <span className="font-semibold text-slate-700 dark:text-zinc-200 shrink-0">{catName(e.category_id)}</span>
                        {e.note && <span className="font-sans text-slate-400 dark:text-zinc-500 truncate">· {e.note}</span>}
                        {e.method && (
                          <span className="hidden sm:inline shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500">
                            {e.method}
                          </span>
                        )}
                      </div>
                      <span className={cn("text-right w-28 sm:w-36 font-semibold", TONE.neutral)}>
                        {fmt(e.amount, locale, currency)}
                      </span>
                    </div>
                  ))}
                </Fragment>
              );
            })}
          </div>
        )}

        {/* Sticky grand total */}
        <div className="sticky bottom-0 flex items-center px-3 sm:px-6 py-4 border-t-2 border-slate-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 backdrop-blur font-mono">
          <div className={cn(TYPE.label, "flex-1")}>{t("transactions.total")}</div>
          <div className="text-xl font-bold text-slate-900 dark:text-zinc-100 text-right w-28 sm:w-36">{fmt(grandTotal, locale, currency)}</div>
        </div>
      </div>

      {/* Manage categories modal */}
      <Modal open={manageOpen} onClose={() => setManageOpen(false)}
        title={t("transactions.manageCategories")}
        actions={<>
          <Btn onClick={() => setManageOpen(false)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={() => { setManageOpen(false); setNewCategory(""); }}>
            <Plus size={14} /> {t("transactions.newCategory")}
          </Btn>
        </>}
      >
        <div className="max-h-80 overflow-y-auto -mx-1 px-1">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-zinc-500 py-4 text-center">{t("transactions.noCategories")}</p>
          ) : categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-2 border-b border-slate-100 dark:border-zinc-800/60 last:border-0">
              <Dot id={c.id} />
              <span className="flex-1 text-sm text-slate-700 dark:text-zinc-200 truncate">{c.name}</span>
              <RowActions items={[
                { label: t("actions.rename"), icon: Pencil, onClick: () => { setEditCategoryErr(false); setEditingCategory({ id: c.id, name: c.name }); } },
                { label: t("actions.delete"), icon: Trash2, tone: "danger", onClick: () => setPendingCatDelete({ id: c.id, name: c.name }) },
              ]} />
            </div>
          ))}
        </div>
      </Modal>

      {/* Rename category modal */}
      <Modal open={!!editingCategory} onClose={() => { setEditingCategory(null); setEditCategoryErr(false); }}
        title={t("category.editTitle")}
        actions={<>
          <Btn onClick={() => { setEditingCategory(null); setEditCategoryErr(false); }}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={saveEditingCategory}>{t("btn.save")}</Btn>
        </>}
      >
        {editingCategory && (
          <>
            <input
              type="text" autoFocus
              value={editingCategory.name}
              onChange={(e) => { setEditingCategory((p) => ({ ...p, name: e.target.value })); setEditCategoryErr(false); }}
              onKeyDown={(e) => e.key === "Enter" && saveEditingCategory()}
              className={INPUT}
            />
            {editCategoryErr && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{t("transactions.catRenameDup")}</p>
            )}
          </>
        )}
      </Modal>

      {/* Delete category modal */}
      <Modal open={!!pendingCatDelete} onClose={() => setPendingCatDelete(null)}
        title={t("category.deleteTitle")}
        description={t("transactions.catDeleteDesc").replace("{name}", pendingCatDelete?.name ?? "")}
        actions={<>
          <Btn onClick={() => setPendingCatDelete(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="danger" size="md" onClick={handleDeleteCategory}>{t("btn.delete")}</Btn>
        </>}
      />

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
        description={t("transactions.deleteDesc").replace("{name}", pendingDelete?.note || catName(pendingDelete?.category_id))}
        actions={<>
          <Btn onClick={() => setPendingDelete(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="danger" size="md" onClick={handleDelete}>{t("btn.delete")}</Btn>
        </>}
      >
        {pendingDelete && (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 px-3 py-2.5 font-mono">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 min-w-0">
              <Dot id={pendingDelete.category_id} />
              {catName(pendingDelete.category_id)}
              {pendingDelete.note && <span className="font-sans font-normal text-slate-400 dark:text-zinc-500 truncate">· {pendingDelete.note}</span>}
            </span>
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 shrink-0">{fmt(pendingDelete.amount, locale, currency)}</span>
          </div>
        )}
      </Modal>

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
              <select value={editing.category_id ?? ""} onChange={(e) => setEditing((p) => ({ ...p, category_id: e.target.value }))} className={INPUT}>
                <option value="">{t("transactions.uncategorized")}</option>
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

// Skeleton placeholder while transactions load.
function LoadingRows() {
  return (
    <div className="animate-pulse">
      {[0, 1, 2].map((g) => (
        <Fragment key={g}>
          <div className="px-3 py-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-800/40">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-zinc-700" />
          </div>
          {[0, 1].map((r) => (
            <div key={r} className="flex items-center justify-between px-3 py-3 border-b border-slate-100 dark:border-zinc-800/60">
              <div className="h-3 w-40 rounded bg-slate-200 dark:bg-zinc-800" />
              <div className="h-3 w-16 rounded bg-slate-200 dark:bg-zinc-800" />
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

// Sort date desc, then created_at desc so newest entries sit at the top of a day.
function sortRows(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.created_at || "") < (a.created_at || "") ? -1 : 1;
}
