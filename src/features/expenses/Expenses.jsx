import { useState } from "react";
import { Plus, Trash2, Cloud, Pencil, Tags } from "lucide-react";
import { useI18n } from "../../i18n/index.jsx";
import { useToast } from "../../components/Toast.jsx";
import { useResource } from "../../lib/useResource.js";
import { cn, toMonthKey, fmt } from "../../lib/utils.js";
import {
  fetchCategories, fetchExpenses, upsertExpenseStatus, updateExpense,
  reorderExpenses, reorderCategories, createCategory, createExpense, updateCategory,
  deleteExpense as deleteExpenseApi, deleteCategory as deleteCategoryApi,
} from "../../api.js";
import Modal from "../../components/Modal.jsx";
import Btn from "../../components/Btn.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import RowActions from "../../components/RowActions.jsx";
import AmountInput from "../../components/AmountInput.jsx";
import CategorizedList from "../../components/CategorizedList.jsx";
import { SECTION_COLORS, TYPE } from "../../lib/tokens.js";

const STATUS_OPTIONS = ["paid", "unpaid", "scheduled", "verify"];
const DONE_STATUS = "paid";
// Writes that keep the optimistic change even if the server call fails.
const noRollback = async () => {};

export default function Expenses() {
  const { t, locale, currency } = useI18n();
  const { showError } = useToast();
  const today = new Date();
  const [editing, setEditing] = useState(null); // { id, section_id, name, amount }
  const [newCategory, setNewCategory] = useState(null); // null | string
  const [editingCategory, setEditingCategory] = useState(null); // null | { id, name }
  const [editCategoryErr, setEditCategoryErr] = useState(false);
  const [manageOpen, setManageOpen] = useState(false); // category manager modal
  const [pendingDelete, setPendingDelete] = useState(null); // null | { id, name }
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState(null); // null | { id, name }
  const [newExpense, setNewExpense] = useState(null); // null | { section_id, name, amount }
  const [viewDate, setViewDate] = useState(today);

  const monthKey = toMonthKey(viewDate);
  const currentMonthKey = toMonthKey(today);
  const isPastMonth = monthKey < currentMonthKey;

  const cats = useResource(() => fetchCategories("expense", isPastMonth), [monthKey]);
  const exps = useResource(() => fetchExpenses(null, monthKey), [monthKey]);
  const categories = cats.rows;
  const expenses = exps.rows;
  const loading = cats.loading || exps.loading;
  const error = cats.error || exps.error;

  const all = expenses;
  const grandTotal = all.reduce((s, e) => s + e.amount, 0);
  const paidTotal = all.filter((e) => e.status === DONE_STATUS).reduce((s, e) => s + e.amount, 0);
  const pending = grandTotal - paidTotal;

  const handleStatusChange = (id, newStatus) =>
    exps.mutate(
      (xs) => xs.map((e) => e.id === id ? { ...e, status: newStatus } : e),
      () => upsertExpenseStatus(id, monthKey, { status: newStatus }),
    ).catch(showError);

  const handleDeleteExpense = async () => {
    if (!pendingDeleteExpense) return;
    const { id } = pendingDeleteExpense;
    setPendingDeleteExpense(null);
    exps.mutate((xs) => xs.filter((e) => e.id !== id), noRollback);
    try {
      await deleteExpenseApi(id);
    } catch (e) {
      showError(e);
    }
  };

  const moveCategory = (id, direction) => {
    const idx = categories.findIndex((c) => c.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved);
    const updated = reordered.map((c, i) => ({ ...c, position: i }));
    return cats.mutate(
      () => updated,
      () => reorderCategories("expense", updated.map((c) => ({ id: c.id, position: c.position }))),
    ).catch(showError);
  };

  const saveEditingCategory = () => {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    if (!name) return;
    // Block renaming onto another existing category (case-insensitive).
    if (categories.some((c) => c.id !== editingCategory.id && c.name.toLowerCase() === name.toLowerCase())) {
      setEditCategoryErr(true);
      return;
    }
    const { id } = editingCategory;
    setEditingCategory(null);
    setEditCategoryErr(false);
    return cats.mutate(
      (xs) => xs.map((c) => c.id === id ? { ...c, name } : c),
      () => updateCategory("expense", id, name),
    ).catch(showError);
  };

  const handleDeleteCategory = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    cats.mutate((xs) => xs.filter((c) => c.id !== id), noRollback);
    // Keep the items; they orphan into the Uncategorized bucket.
    try {
      await deleteCategoryApi("expense", id);
    } catch (e) {
      showError(e);
    }
  };

  const handleCreateCategory = async () => {
    const name = (newCategory || "").trim();
    if (!name) return;
    setNewCategory(null);
    // Reuse an existing category instead of creating a case-insensitive duplicate.
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    try {
      const sec = await createCategory("expense", name);
      cats.mutate((xs) => xs.some((c) => c.id === sec.id) ? xs : [...xs, sec], noRollback);
    } catch (e) {
      showError(e);
    }
  };

  const handleCreateExpense = async () => {
    if (!newExpense) return;
    const name = (newExpense.name || "").trim();
    if (!name) return;
    const draft = { ...newExpense, name };
    setNewExpense(null);
    try {
      const exp = await createExpense(draft.category_id || null, draft.name, draft.amount);
      exps.mutate((xs) => [...xs, exp], noRollback);
    } catch (e) {
      showError(e);
    }
  };

  const saveEditing = () => {
    if (!editing) return;
    const { id, name, amount } = editing;
    const categoryId = editing.category_id || null;
    setEditing(null);
    return exps.mutate(
      (xs) => xs.map((e) => e.id === id ? { ...e, name, amount, category_id: categoryId } : e),
      () => Promise.all([
        updateExpense(id, { expense: name, category_id: categoryId }),
        upsertExpenseStatus(id, monthKey, { value: amount }),
      ]),
    ).catch(showError);
  };

  const handleReorder = async (catId, updated) => {
    exps.mutate((prev) => [...prev.filter((e) => e.category_id !== catId), ...updated], noRollback);
    try {
      await reorderExpenses(updated.map((e) => ({ id: e.id, position: e.position })));
    } catch (err) {
      showError(err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64 text-rose-400 dark:text-rose-500 text-sm">
      {t(error)}
    </div>
  );

  return (
    <div className="animate-fade-in space-y-2" style={{ fontVariantNumeric: "tabular-nums" }}>
      <PageHeader
        viewDate={viewDate} onSelectMonth={setViewDate}
        title={t("expenses.title")}
        meta={`${all.length} ${t("expenses.transactions")} · ${categories.length} ${t("expenses.categories")}`}
        metrics={[
          { label: t("summary.paid"), value: fmt(paidTotal, locale, currency), tone: "positive" },
          { label: t("expenses.pending"), value: fmt(pending, locale, currency), tone: "negative" },
          { label: t("summary.total"), value: fmt(grandTotal, locale, currency), tone: "neutral" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="default" size="md" onClick={() => setManageOpen(true)}>
              <Tags size={15} /> {t("category.manage")}
            </Btn>
            {!isPastMonth && (
              <Btn variant="primary" size="md" onClick={() => setNewExpense({ category_id: "", name: "", amount: 0 })}>
                <Plus size={15} /> {t("expenses.newExpense")}
              </Btn>
            )}
          </div>
        }
      />
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <CategorizedList
            categories={categories} items={expenses} nameLabel={t("col.expense")}
            statusOptions={STATUS_OPTIONS} doneStatus={DONE_STATUS} readOnly={isPastMonth}
            onStatusChange={handleStatusChange}
            onItemClick={(e) => setEditing({ id: e.id, category_id: e.category_id ?? "", name: e.name, amount: e.amount })}
            onItemDelete={(e) => setPendingDeleteExpense({ id: e.id, name: e.name })}
            onItemsReorder={handleReorder}
            onAddItem={(catId) => setNewExpense({ category_id: catId, name: "", amount: 0 })}
            onRenameCategory={(c) => setEditingCategory({ id: c.id, name: c.name })}
            onMoveCategory={moveCategory}
            onDeleteCategory={(c) => setPendingDelete({ id: c.id, name: c.name })}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-slate-200 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
          <div className={cn(TYPE.label)}>{t("expenses.finalBalance")}</div>
          <div className="text-xl font-mono font-bold text-slate-900 dark:text-zinc-100 pr-16">{fmt(grandTotal, locale, currency)}</div>
        </div>
      </div>

      {/* New section modal */}
      <Modal open={newCategory !== null} onClose={() => setNewCategory(null)}
        title={t("expenses.newCategory")}
        actions={<>
          <Btn onClick={() => setNewCategory(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleCreateCategory}>{t("btn.save")}</Btn>
        </>}
      >
        <div className="mb-2">
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Name</label>
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

      {/* Edit category modal */}
      <Modal open={!!editingCategory} onClose={() => { setEditingCategory(null); setEditCategoryErr(false); }}
        title={t("category.editTitle")}
        actions={<>
          <Btn onClick={() => { setEditingCategory(null); setEditCategoryErr(false); }}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={saveEditingCategory}>{t("btn.save")}</Btn>
        </>}
      >
        {editingCategory && (
          <div className="mb-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Name</label>
            <input
              type="text"
              value={editingCategory.name}
              onChange={(e) => { setEditingCategory((p) => ({ ...p, name: e.target.value })); setEditCategoryErr(false); }}
              onKeyDown={(e) => e.key === "Enter" && saveEditingCategory()}
              autoFocus
              className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
            />
            {editCategoryErr && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{t("category.renameDup")}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Manage categories modal */}
      <Modal open={manageOpen} onClose={() => setManageOpen(false)}
        title={t("category.manage")}
        actions={<>
          <Btn onClick={() => setManageOpen(false)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={() => { setManageOpen(false); setNewCategory(""); }}>
            <Plus size={14} /> {t("expenses.newCategory")}
          </Btn>
        </>}
      >
        <div className="max-h-80 overflow-y-auto -mx-1 px-1">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-zinc-500 py-4 text-center">{t("expenses.newCategory")}</p>
          ) : categories.map((c, ci) => (
            <div key={c.id} className="flex items-center gap-2 py-2 border-b border-slate-100 dark:border-zinc-800/60 last:border-0">
              <span style={{ background: SECTION_COLORS[ci % SECTION_COLORS.length] }} className="inline-block w-2 h-2 rounded-full shrink-0" />
              <span className="flex-1 text-sm text-slate-700 dark:text-zinc-200 truncate">{c.name}</span>
              <RowActions items={[
                { label: t("actions.rename"), icon: Pencil, onClick: () => { setEditCategoryErr(false); setEditingCategory({ id: c.id, name: c.name }); } },
                { label: t("actions.delete"), icon: Trash2, tone: "danger", onClick: () => setPendingDelete({ id: c.id, name: c.name }) },
              ]} />
            </div>
          ))}
        </div>
      </Modal>

      {/* New expense modal */}
      <Modal open={!!newExpense} onClose={() => setNewExpense(null)}
        title={t("expenses.newExpense")}
        actions={<>
          <Btn onClick={() => setNewExpense(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleCreateExpense}>{t("btn.save")}</Btn>
        </>}
      >
        {newExpense && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.expense")}</label>
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
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.value")}</label>
              <AmountInput
                value={newExpense.amount}
                onChange={(v) => setNewExpense((p) => ({ ...p, amount: v }))}
                onEnter={handleCreateExpense}
                format={(n) => fmt(n, locale, currency)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("transactions.category")}</label>
              <select
                value={newExpense.category_id ?? ""}
                onChange={(e) => setNewExpense((p) => ({ ...p, category_id: e.target.value }))}
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              >
                <option value="">{t("category.uncategorized")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.expense")}</label>
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
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.value")}</label>
              <AmountInput
                value={editing.amount}
                onChange={(v) => setEditing((p) => ({ ...p, amount: v }))}
                onEnter={saveEditing}
                format={(n) => fmt(n, locale, currency)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("transactions.category")}</label>
              <select
                value={editing.category_id ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, category_id: e.target.value }))}
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              >
                <option value="">{t("category.uncategorized")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
