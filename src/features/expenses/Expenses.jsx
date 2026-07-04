import { useState, useEffect, Fragment } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Trash2, ChevronDown, Cloud, GripVertical, Pencil, ArrowUp, ArrowDown, Tags } from "lucide-react";
import { useI18n } from "../../i18n/index.jsx";
import { cn, toMonthKey, fmt } from "../../lib/utils.js";
import {
  fetchCategories, fetchExpenses, upsertExpenseStatus, updateExpense,
  reorderExpenses, reorderCategories, createCategory, createExpense, updateCategory,
  deleteExpense as deleteExpenseApi, deleteCategory as deleteCategoryApi,
} from "../../api.js";
import Modal from "../../components/Modal.jsx";
import Btn from "../../components/Btn.jsx";
import StatusPicker from "../../components/StatusPicker.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import ProgressBar from "../../components/ProgressBar.jsx";
import RowActions from "../../components/RowActions.jsx";
import AmountInput from "../../components/AmountInput.jsx";
import { SECTION_COLORS, TONE, TYPE } from "../../lib/tokens.js";

export default function Expenses() {
  const { t, locale, currency } = useI18n();
  const today = new Date();
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // { id, section_id, name, amount }
  const [newCategory, setNewCategory] = useState(null); // null | string
  const [editingCategory, setEditingCategory] = useState(null); // null | { id, name }
  const [editCategoryErr, setEditCategoryErr] = useState(false);
  const [manageOpen, setManageOpen] = useState(false); // category manager modal
  const [collapsed, setCollapsed] = useState(new Set());
  const [pendingDelete, setPendingDelete] = useState(null); // null | { id, name }
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState(null); // null | { id, name }
  const [newExpense, setNewExpense] = useState(null); // null | { section_id, name, amount }
  const [viewDate, setViewDate] = useState(today);

  const monthKey = toMonthKey(viewDate);
  const currentMonthKey = toMonthKey(today);
  const isPastMonth = monthKey < currentMonthKey;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCategories("expense", isPastMonth),
      fetchExpenses(null, monthKey),
    ]).then(([secs, exps]) => {
      setCategories(secs);
      setExpenses(exps);
      setLoading(false);
    }).catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  }, [monthKey]);

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
      await upsertExpenseStatus(id, monthKey, { status: newStatus });
    } catch {
      setExpenses((xs) => xs.map((e) => e.id === id ? { ...e, status: prev.status } : e));
    }
  };


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

  const toggleCollapsed = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const moveCategory = async (id, direction) => {
    const idx = categories.findIndex((c) => c.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved);
    const updated = reordered.map((c, i) => ({ ...c, position: i }));
    setCategories(updated);
    try {
      await reorderCategories("expense", updated.map((c) => ({ id: c.id, position: c.position })));
    } catch {
      setCategories(categories);
    }
  };

  const saveEditingCategory = async () => {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    if (!name) return;
    // Block renaming onto another existing category (case-insensitive).
    if (categories.some((c) => c.id !== editingCategory.id && c.name.toLowerCase() === name.toLowerCase())) {
      setEditCategoryErr(true);
      return;
    }
    const prev = categories.find((c) => c.id === editingCategory.id);
    setCategories((xs) => xs.map((c) => c.id === editingCategory.id ? { ...c, name } : c));
    setEditingCategory(null);
    setEditCategoryErr(false);
    try {
      await updateCategory("expense", editingCategory.id, name);
    } catch {
      setCategories((xs) => xs.map((c) => c.id === editingCategory.id ? { ...c, name: prev.name } : c));
    }
  };

  const handleDeleteCategory = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    setCategories((xs) => xs.filter((c) => c.id !== id));
    setExpenses((xs) => xs.filter((e) => e.category_id !== id));
    try {
      await deleteCategoryApi("expense", id);
    } catch (e) {
      console.error(e);
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
      setCategories((xs) => xs.some((c) => c.id === sec.id) ? xs : [...xs, sec]);
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
      await Promise.all([
        updateExpense(editing.id, { expense: editing.name }),
        upsertExpenseStatus(editing.id, monthKey, { value: editing.amount }),
      ]);
    } catch {
      setExpenses((xs) => xs.map((e) => e.id === editing.id ? { ...e, name: prev.name, amount: prev.amount } : e));
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId !== destination.droppableId || source.index === destination.index) return;
    const catId = source.droppableId;
    const catExpenses = expenses.filter((e) => e.category_id === catId);
    const reordered = [...catExpenses];
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    const updated = reordered.map((e, i) => ({ ...e, position: i }));
    setExpenses((prev) => [
      ...prev.filter((e) => e.category_id !== catId),
      ...updated,
    ]);
    try {
      await reorderExpenses(updated.map((e) => ({ id: e.id, position: e.position })));
    } catch (err) {
      console.error(err);
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
          <Btn variant="primary" size="md" onClick={() => setManageOpen(true)}>
            <Tags size={15} /> {t("category.manage")}
          </Btn>
        }
      />
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
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
            <DragDropContext onDragEnd={handleDragEnd}>
              {grouped.map((sec, si) => {
                const catTotal = sec.items.reduce((s, e) => s + e.amount, 0);
                const catPaid = sec.items.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);
                const color = SECTION_COLORS[si % SECTION_COLORS.length];
                const catActions = [
                  { label: t("actions.add"), icon: Plus, onClick: () => setNewExpense({ category_id: sec.id, name: "", amount: 0 }) },
                  { label: t("actions.rename"), icon: Pencil, onClick: () => setEditingCategory({ id: sec.id, name: sec.name }) },
                  { label: t("actions.moveUp"), icon: ArrowUp, onClick: () => moveCategory(sec.id, -1), disabled: si === 0 },
                  { label: t("actions.moveDown"), icon: ArrowDown, onClick: () => moveCategory(sec.id, 1), disabled: si === grouped.length - 1 },
                  { label: t("actions.delete"), icon: Trash2, tone: "danger", onClick: () => setPendingDelete({ id: sec.id, name: sec.name }) },
                ];
                return (
                  <Fragment key={sec.id}>
                    <tbody>
                      <tr className="border-t-2 border-slate-200 dark:border-zinc-700 bg-slate-200/70 dark:bg-zinc-700/60">
                        <td className="py-2.5 px-3">
                          <span style={{ background: color }} className="inline-block w-2 h-2 rounded-full" />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-zinc-300 tracking-widest uppercase">
                          <span className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCollapsed(sec.id); }}
                              className="inline-flex items-center justify-center w-4 h-4 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
                            >
                              <ChevronDown size={10} className={cn("transition-transform", collapsed.has(sec.id) && "-rotate-90")} />
                            </button>
                            {sec.name}
                            <span className="text-[10px] font-normal text-slate-400 dark:text-zinc-600 normal-case tracking-normal">· {sec.items.length} items</span>
                            <span className="hidden sm:block w-20">
                              <ProgressBar value={catPaid} max={catTotal} tone="positive" height="h-1" />
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 dark:text-zinc-400">{fmt(catTotal, locale, currency)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {!isPastMonth && <RowActions items={catActions} />}
                        </td>
                      </tr>
                    </tbody>
                    {!collapsed.has(sec.id) && <Droppable droppableId={sec.id} isDropDisabled={isPastMonth}>
                      {(droppableProvided) => (
                        <tbody ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
                          {sec.items.map((e, i) => (
                            <Draggable key={e.id} draggableId={e.id} index={i} isDragDisabled={isPastMonth}>
                              {(draggableProvided, snapshot) => (
                                <tr
                                  ref={draggableProvided.innerRef}
                                  {...draggableProvided.draggableProps}
                                  onClick={() => !isPastMonth && !snapshot.isDragging && setEditing({ id: e.id, section_id: e.section_id, name: e.name, amount: e.amount })}
                                  className={cn(
                                    "border-b border-slate-100 dark:border-zinc-800/60 transition-colors",
                                    i % 2 === 1 ? "bg-slate-50/50 dark:bg-zinc-800/30" : "",
                                    isPastMonth ? "" : "hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 cursor-pointer",
                                    snapshot.isDragging ? "bg-emerald-50 dark:bg-emerald-950/20 shadow-md" : ""
                                  )}>
                                  <td className="py-1.5 px-3 w-12" onClick={(ev) => ev.stopPropagation()}>
                                    <span className="flex items-center gap-1">
                                      {!isPastMonth && (
                                        <span
                                          {...draggableProvided.dragHandleProps}
                                          className="inline-flex items-center justify-center w-4 h-4 text-slate-300 dark:text-zinc-600 hover:text-slate-500 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing"
                                        >
                                          <GripVertical size={10} />
                                        </span>
                                      )}
                                      {!isPastMonth && (
                                        <button
                                          onClick={() => setPendingDeleteExpense({ id: e.id, name: e.name })}
                                          className="inline-flex items-center justify-center w-4 h-4 rounded text-slate-300 dark:text-zinc-600 hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      )}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-3 text-slate-700 dark:text-zinc-300">{e.name}</td>
                                  <td className={cn("py-1.5 px-3 text-right font-semibold", e.amount === 0 ? TONE.meta : TONE.neutral)}>
                                    {fmt(e.amount, locale, currency)}
                                  </td>
                                  <td className="py-1.5 px-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                                    <StatusPicker status={e.status} onChange={(v) => handleStatusChange(e.id, v)} />
                                  </td>
                                </tr>
                              )}
                            </Draggable>
                          ))}
                          {droppableProvided.placeholder}
                        </tbody>
                      )}
                    </Droppable>}
                  </Fragment>
                );
              })}
            </DragDropContext>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-slate-200 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50 font-mono">
          <div className={cn(TYPE.label)}>{t("expenses.finalBalance")}</div>
          <div className="text-xl font-bold text-slate-900 dark:text-zinc-100 pr-16">{fmt(grandTotal, locale, currency)}</div>
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
            <label className="block font-mono text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Name</label>
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
              <AmountInput
                value={newExpense.amount}
                onChange={(v) => setNewExpense((p) => ({ ...p, amount: v }))}
                onEnter={handleCreateExpense}
                format={(n) => fmt(n, locale, currency)}
              />
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
              <AmountInput
                value={editing.amount}
                onChange={(v) => setEditing((p) => ({ ...p, amount: v }))}
                onEnter={saveEditing}
                format={(n) => fmt(n, locale, currency)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
