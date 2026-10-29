import { useState } from "react";
import { Plus, Trash2, Cloud, Pencil, Tags } from "lucide-react";
import { useI18n } from "../../i18n/index.jsx";
import { useToast } from "../../components/Toast.jsx";
import { toMonthKey, fmt } from "../../lib/utils.js";
import { useResource } from "../../lib/useResource.js";
import {
  fetchCategories, fetchIncome, upsertIncomeStatus, updateIncome,
  reorderIncome, reorderCategories, createCategory, createIncome, updateCategory,
  deleteIncome as deleteIncomeApi, deleteCategory as deleteCategoryApi,
} from "../../api.js";
import Modal from "../../components/Modal.jsx";
import Btn from "../../components/Btn.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import RowActions from "../../components/RowActions.jsx";
import AmountInput from "../../components/AmountInput.jsx";
import CategorizedList from "../../components/CategorizedList.jsx";
import { SECTION_COLORS, TYPE } from "../../lib/tokens.js";

const STATUS_OPTIONS = ["received", "expected"];
const DONE_STATUS = "received";

export default function Income() {
  const { t, locale, currency } = useI18n();
  const { showError } = useToast();
  const today = new Date();
  const [editing, setEditing] = useState(null); // { id, category_id, name, amount }
  const [newCategory, setNewCategory] = useState(null); // null | string
  const [editingCategory, setEditingCategory] = useState(null); // null | { id, name }
  const [editCategoryErr, setEditCategoryErr] = useState(false);
  const [manageOpen, setManageOpen] = useState(false); // category manager modal
  const [pendingDelete, setPendingDelete] = useState(null); // null | { id, name }
  const [pendingDeleteIncome, setPendingDeleteIncome] = useState(null); // null | { id, name }
  const [newIncome, setNewIncome] = useState(null); // null | { category_id, name, amount }
  const [viewDate, setViewDate] = useState(today);

  const monthKey = toMonthKey(viewDate);
  const isPastMonth = monthKey < toMonthKey(today);

  const cats = useResource(() => fetchCategories("income", isPastMonth), [monthKey]);
  const items = useResource(() => fetchIncome(null, monthKey), [monthKey]);
  const categories = cats.rows;
  const income = items.rows;

  const grandTotal = income.reduce((s, e) => s + e.amount, 0);
  const receivedTotal = income.filter((e) => e.status === DONE_STATUS).reduce((s, e) => s + e.amount, 0);
  const pending = grandTotal - receivedTotal;

  // Convention below: a save that rejects rolls back; a save that catches its own
  // error keeps the optimistic change, matching the pre-rebuild behavior.
  const patchItem = (id, patch) => (xs) => xs.map((e) => e.id === id ? { ...e, ...patch } : e);

  const handleStatusChange = (id, status) =>
    items.mutate(patchItem(id, { status }), () => upsertIncomeStatus(id, monthKey, { status })).catch(showError);

  const handleDeleteIncome = () => {
    if (!pendingDeleteIncome) return;
    const { id } = pendingDeleteIncome;
    setPendingDeleteIncome(null);
    items.mutate((xs) => xs.filter((e) => e.id !== id), () => deleteIncomeApi(id).catch(showError));
  };

  const moveCategory = (id, direction) => {
    const idx = categories.findIndex((c) => c.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved);
    const updated = reordered.map((c, i) => ({ ...c, position: i }));
    cats.mutate(() => updated,
      () => reorderCategories("income", updated.map((c) => ({ id: c.id, position: c.position })))).catch(showError);
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
    cats.mutate(patchItem(id, { name }), () => updateCategory("income", id, name)).catch(showError);
  };

  const handleDeleteCategory = () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    // Keep the items; they orphan into the Uncategorized bucket.
    cats.mutate((xs) => xs.filter((c) => c.id !== id), () => deleteCategoryApi("income", id).catch(showError));
  };

  const handleCreateCategory = async () => {
    const name = (newCategory || "").trim();
    if (!name) return;
    setNewCategory(null);
    // Reuse an existing category instead of creating a case-insensitive duplicate.
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    try {
      const sec = await createCategory("income", name);
      cats.mutate((xs) => xs.some((c) => c.id === sec.id) ? xs : [...xs, sec], () => {});
    } catch (e) {
      showError(e);
    }
  };

  const handleCreateIncome = async () => {
    if (!newIncome) return;
    const name = (newIncome.name || "").trim();
    if (!name) return;
    const draft = { ...newIncome, name };
    setNewIncome(null);
    try {
      const inc = await createIncome(draft.category_id || null, draft.name, draft.amount);
      items.mutate((xs) => [...xs, inc], () => {});
    } catch (e) {
      showError(e);
    }
  };

  const saveEditing = () => {
    if (!editing) return;
    const { id, name, amount } = editing;
    const categoryId = editing.category_id || null;
    setEditing(null);
    items.mutate(patchItem(id, { name, amount, category_id: categoryId }), () => Promise.all([
      updateIncome(id, { income: name, category_id: categoryId }),
      upsertIncomeStatus(id, monthKey, { value: amount }),
    ])).catch(showError);
  };

  const handleItemsReorder = (catId, updated) =>
    items.mutate(
      (prev) => [...prev.filter((e) => e.category_id !== catId), ...updated],
      () => reorderIncome(updated.map((e) => ({ id: e.id, position: e.position }))).catch(showError),
    );

  if (cats.loading || items.loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  const error = cats.error || items.error;
  if (error) return (
    <div className="flex items-center justify-center h-64 text-rose-400 dark:text-rose-500 text-sm">
      {t(error)}
    </div>
  );

  return (
    <div className="animate-fade-in space-y-2" style={{ fontVariantNumeric: "tabular-nums" }}>
      <PageHeader
        viewDate={viewDate} onSelectMonth={setViewDate}
        title={t("income.title")}
        meta={`${income.length} ${t("income.transactions")} · ${categories.length} ${t("income.sources")}`}
        metrics={[
          { label: t("income.received"), value: fmt(receivedTotal, locale, currency), tone: "positive" },
          { label: t("income.pending"), value: fmt(pending, locale, currency), tone: "pending" },
          { label: t("summary.total"), value: fmt(grandTotal, locale, currency), tone: "neutral" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="default" size="md" onClick={() => setManageOpen(true)}>
              <Tags size={15} /> {t("category.manage")}
            </Btn>
            {!isPastMonth && (
              <Btn variant="primary" size="md" onClick={() => setNewIncome({ category_id: "", name: "", amount: 0 })}>
                <Plus size={15} /> {t("income.newIncome")}
              </Btn>
            )}
          </div>
        }
      />
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <CategorizedList
            categories={categories} items={income} nameLabel={t("col.income")}
            statusOptions={STATUS_OPTIONS} doneStatus={DONE_STATUS} readOnly={isPastMonth}
            onStatusChange={handleStatusChange}
            onItemClick={(e) => setEditing({ id: e.id, category_id: e.category_id ?? "", name: e.name, amount: e.amount })}
            onItemDelete={(e) => setPendingDeleteIncome({ id: e.id, name: e.name })}
            onItemsReorder={handleItemsReorder}
            onAddItem={(categoryId) => setNewIncome({ category_id: categoryId, name: "", amount: 0 })}
            onRenameCategory={(c) => setEditingCategory({ id: c.id, name: c.name })}
            onMoveCategory={moveCategory}
            onDeleteCategory={(c) => setPendingDelete({ id: c.id, name: c.name })}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-slate-200 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
          <div className={TYPE.label}>{t("income.finalBalance")}</div>
          <div className="text-xl font-mono font-bold text-slate-900 dark:text-zinc-100 pr-16">{fmt(grandTotal, locale, currency)}</div>
        </div>
      </div>

      {/* New section modal */}
      <Modal open={newCategory !== null} onClose={() => setNewCategory(null)}
        title={t("income.newCategory")}
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

      {/* Delete income modal */}
      <Modal open={!!pendingDeleteIncome} onClose={() => setPendingDeleteIncome(null)}
        title={t("income.deleteTitle")}
        description={t("income.deleteDesc").replace("{name}", pendingDeleteIncome?.name ?? "")}
        actions={<>
          <Btn onClick={() => setPendingDeleteIncome(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="danger" size="md" onClick={handleDeleteIncome}>{t("btn.delete")}</Btn>
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
            <Plus size={14} /> {t("income.newCategory")}
          </Btn>
        </>}
      >
        <div className="max-h-80 overflow-y-auto -mx-1 px-1">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-zinc-500 py-4 text-center">{t("income.newCategory")}</p>
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

      {/* New income modal */}
      <Modal open={!!newIncome} onClose={() => setNewIncome(null)}
        title={t("income.newItem")}
        actions={<>
          <Btn onClick={() => setNewIncome(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={handleCreateIncome}>{t("btn.save")}</Btn>
        </>}
      >
        {newIncome && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.income")}</label>
              <input
                type="text"
                value={newIncome.name}
                onChange={(e) => setNewIncome((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreateIncome()}
                autoFocus
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.value")}</label>
              <AmountInput
                value={newIncome.amount}
                onChange={(v) => setNewIncome((p) => ({ ...p, amount: v }))}
                onEnter={handleCreateIncome}
                format={(n) => fmt(n, locale, currency)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("transactions.category")}</label>
              <select
                value={newIncome.category_id ?? ""}
                onChange={(e) => setNewIncome((p) => ({ ...p, category_id: e.target.value }))}
                className="w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              >
                <option value="">{t("category.uncategorized")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit income modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)}
        title={t("income.editTitle")}
        actions={<>
          <Btn onClick={() => setEditing(null)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={saveEditing}>{t("btn.save")}</Btn>
        </>}
      >
        {editing && (
          <div className="space-y-3 mb-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{t("col.income")}</label>
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
