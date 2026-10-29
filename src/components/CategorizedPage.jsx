import { useState } from "react";
import { Plus, Trash2, Cloud, Pencil, Tags } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import { useToast } from "./Toast.jsx";
import { useResource } from "../lib/useResource.js";
import { toMonthKey, fmt } from "../lib/utils.js";
import Modal from "./Modal.jsx";
import Btn from "./Btn.jsx";
import PageHeader from "./PageHeader.jsx";
import RowActions from "./RowActions.jsx";
import AmountInput from "./AmountInput.jsx";
import CategorizedList from "./CategorizedList.jsx";
import { SECTION_COLORS, TYPE } from "../lib/tokens.js";

const LABEL_CLS = "block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5";
const FIELD_CLS = "w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition";

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

// Move row `id` by `direction` slots and renumber positions; out of bounds is a no-op.
export const moveById = (xs, id, direction) => {
  const idx = xs.findIndex((c) => c.id === id);
  const newIdx = idx + direction;
  if (idx < 0 || newIdx < 0 || newIdx >= xs.length) return xs;
  const reordered = [...xs];
  const [moved] = reordered.splice(idx, 1);
  reordered.splice(newIdx, 0, moved);
  return reordered.map((c, i) => ({ ...c, position: i }));
};

function NameModal({ open, title, value, onChange, onSave, onClose, error }) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={title}
      actions={<>
        <Btn onClick={onClose}>{t("btn.cancel")}</Btn>
        <Btn variant="primary" size="md" onClick={onSave}>{t("btn.save")}</Btn>
      </>}
    >
      {open && (
        <div className="mb-2">
          <label className={LABEL_CLS}>Name</label>
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSave()} autoFocus className={FIELD_CLS} />
          {error && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

function ConfirmDelete({ target, title, description, onConfirm, onClose }) {
  const { t } = useI18n();
  return (
    <Modal open={!!target} onClose={onClose} title={title}
      description={description.replace("{name}", target?.name ?? "")}
      actions={<>
        <Btn onClick={onClose}>{t("btn.cancel")}</Btn>
        <Btn variant="danger" size="md" onClick={onConfirm}>{t("btn.delete")}</Btn>
      </>}
    />
  );
}

// Shared by the new-item and edit-item modals: name, amount, category.
function ItemModal({ draft, setDraft, title, nameLabel, categories, onSave }) {
  const { t, locale, currency } = useI18n();
  const close = () => setDraft(null);
  return (
    <Modal open={!!draft} onClose={close} title={title}
      actions={<>
        <Btn onClick={close}>{t("btn.cancel")}</Btn>
        <Btn variant="primary" size="md" onClick={onSave}>{t("btn.save")}</Btn>
      </>}
    >
      {draft && (
        <div className="space-y-3 mb-2">
          <div>
            <label className={LABEL_CLS}>{nameLabel}</label>
            <input type="text" value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && onSave()} autoFocus className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{t("col.value")}</label>
            <AmountInput value={draft.amount} onChange={(v) => setDraft((p) => ({ ...p, amount: v }))}
              onEnter={onSave} format={(n) => fmt(n, locale, currency)} />
          </div>
          <div>
            <label className={LABEL_CLS}>{t("transactions.category")}</label>
            <select value={draft.category_id ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, category_id: e.target.value }))} className={FIELD_CLS}>
              <option value="">{t("category.uncategorized")}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}
    </Modal>
  );
}

// Monthly categorized page shared by Expenses and Income. Kind-neutral: the feature
// passes its API calls, translated labels, status config and default status.
// Failure policy: status, edit, rename and category move roll back only what they
// changed; delete, create and item reorder keep the optimistic change. All show the error.
export default function CategorizedPage({ api, labels, statusOptions, doneStatus, defaultStatus, pendingTone }) {
  const { t, locale, currency } = useI18n();
  const { showError } = useToast();
  const today = new Date();
  const [viewDate, setViewDate] = useState(today);
  const [editing, setEditing] = useState(null); // null | { id, category_id, name, amount }
  const [newItem, setNewItem] = useState(null); // null | { category_id, name, amount }
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null); // null | { id, name }
  const [newCategory, setNewCategory] = useState(null); // null | string
  const [editingCategory, setEditingCategory] = useState(null); // null | { id, name }
  const [editCategoryErr, setEditCategoryErr] = useState(false);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null); // null | { id, name }
  const [manageOpen, setManageOpen] = useState(false);

  const monthKey = toMonthKey(viewDate);
  const isPastMonth = monthKey < toMonthKey(today);

  const cats = useResource(() => api.fetchCategories(isPastMonth), [monthKey]);
  const entries = useResource(() => api.fetchItems(monthKey), [monthKey]);
  const categories = cats.rows;
  const items = entries.rows;

  const grandTotal = items.reduce((s, e) => s + e.amount, 0);
  const doneTotal = items.filter((e) => e.status === doneStatus).reduce((s, e) => s + e.amount, 0);

  const handleStatusChange = (id, status) =>
    entries.patch(id, { status }, () => api.setStatus(id, monthKey, { status })).catch(showError);

  const saveEditing = () => {
    if (!editing) return;
    const { id, name, amount } = editing;
    const categoryId = editing.category_id || null;
    setEditing(null);
    entries.patch(id, { name, amount, category_id: categoryId }, () => Promise.all([
      api.updateItem(id, name, categoryId),
      api.setStatus(id, monthKey, { value: amount }),
    ])).catch(showError);
  };

  const handleCreateItem = () => {
    if (!newItem) return;
    const name = (newItem.name || "").trim();
    if (!name) return;
    const { category_id, amount } = newItem;
    setNewItem(null);
    api.createItem(category_id || null, name, amount)
      .then((row) => entries.mutate((xs) => [...xs, { ...row, status: row.status ?? defaultStatus }]))
      .catch(showError);
  };

  const handleDeleteItem = () => {
    if (!pendingDeleteItem) return;
    const { id } = pendingDeleteItem;
    setPendingDeleteItem(null);
    entries.mutate((xs) => xs.filter((e) => e.id !== id), () => api.deleteItem(id)).catch(showError);
  };

  const handleItemsReorder = (catId, updated) =>
    entries.mutate(
      (prev) => [...prev.filter((e) => e.category_id !== catId), ...updated],
      () => api.reorderItems(updated.map((e) => ({ id: e.id, position: e.position }))),
    ).catch(showError);

  const moveCategory = (id, direction) => {
    const updated = moveById(categories, id, direction);
    if (updated === categories) return;
    cats.mutate(
      () => updated,
      () => api.reorderCategories(updated.map((c) => ({ id: c.id, position: c.position }))),
      (xs) => moveById(xs, id, -direction),
    ).catch(showError);
  };

  const closeEditCategory = () => { setEditingCategory(null); setEditCategoryErr(false); };

  const saveEditingCategory = () => {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    if (!name) return;
    // Block renaming onto another existing category (case-insensitive).
    if (categories.some((c) => c.id !== editingCategory.id && sameName(c.name, name))) {
      setEditCategoryErr(true);
      return;
    }
    const { id } = editingCategory;
    closeEditCategory();
    cats.patch(id, { name }, () => api.updateCategory(id, name)).catch(showError);
  };

  const handleCreateCategory = () => {
    const name = (newCategory || "").trim();
    if (!name) return;
    setNewCategory(null);
    // Reuse an existing category instead of creating a case-insensitive duplicate.
    if (categories.some((c) => sameName(c.name, name))) return;
    api.createCategory(name)
      .then((sec) => cats.mutate((xs) => xs.some((c) => c.id === sec.id) ? xs : [...xs, sec]))
      .catch(showError);
  };

  const handleDeleteCategory = () => {
    if (!pendingDeleteCategory) return;
    const { id } = pendingDeleteCategory;
    setPendingDeleteCategory(null);
    // Keep the items; they orphan into the Uncategorized bucket.
    cats.mutate((xs) => xs.filter((c) => c.id !== id), () => api.deleteCategory(id)).catch(showError);
  };

  const renameCategory = (c) => { setEditCategoryErr(false); setEditingCategory({ id: c.id, name: c.name }); };
  const askDeleteCategory = (c) => setPendingDeleteCategory({ id: c.id, name: c.name });

  if (cats.loading || entries.loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  const error = cats.error || entries.error;
  if (error) return (
    <div className="flex items-center justify-center h-64 text-rose-400 dark:text-rose-500 text-sm">
      {t(error)}
    </div>
  );

  return (
    <div className="animate-fade-in space-y-2" style={{ fontVariantNumeric: "tabular-nums" }}>
      <PageHeader
        viewDate={viewDate} onSelectMonth={setViewDate}
        title={labels.title}
        meta={`${items.length} ${labels.itemsMeta} · ${categories.length} ${labels.categoriesMeta}`}
        metrics={[
          { label: labels.done, value: fmt(doneTotal, locale, currency), tone: "positive" },
          { label: labels.pending, value: fmt(grandTotal - doneTotal, locale, currency), tone: pendingTone },
          { label: t("summary.total"), value: fmt(grandTotal, locale, currency), tone: "neutral" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="default" size="md" onClick={() => setManageOpen(true)}>
              <Tags size={15} /> {t("category.manage")}
            </Btn>
            {!isPastMonth && (
              <Btn variant="primary" size="md" onClick={() => setNewItem({ category_id: "", name: "", amount: 0 })}>
                <Plus size={15} /> {labels.newItem}
              </Btn>
            )}
          </div>
        }
      />
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <CategorizedList
            categories={categories} items={items} nameLabel={labels.name}
            statusOptions={statusOptions} doneStatus={doneStatus} readOnly={isPastMonth}
            onStatusChange={handleStatusChange}
            onItemClick={(e) => setEditing({ id: e.id, category_id: e.category_id ?? "", name: e.name, amount: e.amount })}
            onItemDelete={(e) => setPendingDeleteItem({ id: e.id, name: e.name })}
            onItemsReorder={handleItemsReorder}
            onAddItem={(categoryId) => setNewItem({ category_id: categoryId, name: "", amount: 0 })}
            onRenameCategory={(c) => setEditingCategory({ id: c.id, name: c.name })}
            onMoveCategory={moveCategory}
            onDeleteCategory={askDeleteCategory}
          />
        </div>

        <div className="px-6 py-4 border-t-2 border-slate-200 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
          <div className={TYPE.label}>{labels.finalBalance}</div>
          <div className="text-xl font-mono font-bold text-slate-900 dark:text-zinc-100 pr-16">{fmt(grandTotal, locale, currency)}</div>
        </div>
      </div>

      <NameModal open={newCategory !== null} title={labels.newCategory} value={newCategory ?? ""}
        onChange={setNewCategory} onSave={handleCreateCategory} onClose={() => setNewCategory(null)} />

      <ConfirmDelete target={pendingDeleteItem} title={labels.deleteTitle} description={labels.deleteDesc}
        onConfirm={handleDeleteItem} onClose={() => setPendingDeleteItem(null)} />

      <ConfirmDelete target={pendingDeleteCategory} title={t("category.deleteTitle")} description={t("category.deleteDesc")}
        onConfirm={handleDeleteCategory} onClose={() => setPendingDeleteCategory(null)} />

      <NameModal open={!!editingCategory} title={t("category.editTitle")} value={editingCategory?.name ?? ""}
        onChange={(name) => { setEditingCategory((p) => ({ ...p, name })); setEditCategoryErr(false); }}
        onSave={saveEditingCategory} onClose={closeEditCategory}
        error={editCategoryErr && t("category.renameDup")} />

      <Modal open={manageOpen} onClose={() => setManageOpen(false)}
        title={t("category.manage")}
        actions={<>
          <Btn onClick={() => setManageOpen(false)}>{t("btn.cancel")}</Btn>
          <Btn variant="primary" size="md" onClick={() => { setManageOpen(false); setNewCategory(""); }}>
            <Plus size={14} /> {labels.newCategory}
          </Btn>
        </>}
      >
        <div className="max-h-80 overflow-y-auto -mx-1 px-1">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-zinc-500 py-4 text-center">{labels.newCategory}</p>
          ) : categories.map((c, ci) => (
            <div key={c.id} className="flex items-center gap-2 py-2 border-b border-slate-100 dark:border-zinc-800/60 last:border-0">
              <span style={{ background: SECTION_COLORS[ci % SECTION_COLORS.length] }} className="inline-block w-2 h-2 rounded-full shrink-0" />
              <span className="flex-1 text-sm text-slate-700 dark:text-zinc-200 truncate">{c.name}</span>
              <RowActions items={[
                { label: t("actions.rename"), icon: Pencil, onClick: () => renameCategory(c) },
                { label: t("actions.delete"), icon: Trash2, tone: "danger", onClick: () => askDeleteCategory(c) },
              ]} />
            </div>
          ))}
        </div>
      </Modal>

      <ItemModal draft={newItem} setDraft={setNewItem} title={labels.newItemTitle} nameLabel={labels.name}
        categories={categories} onSave={handleCreateItem} />

      <ItemModal draft={editing} setDraft={setEditing} title={labels.editTitle} nameLabel={labels.name}
        categories={categories} onSave={saveEditing} />
    </div>
  );
}
