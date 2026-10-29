import { useState, Fragment } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Trash2, ChevronDown, GripVertical, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import { cn, fmt } from "../lib/utils.js";
import StatusPicker from "./StatusPicker.jsx";
import ProgressBar from "./ProgressBar.jsx";
import RowActions from "./RowActions.jsx";
import { SECTION_COLORS, TONE } from "../lib/tokens.js";

const UNCATEGORIZED_ID = "__uncategorized__";

// Shared table for Expenses and Income: category sections, collapse, drag-reorder,
// row actions and the per-month StatusPicker. Pure view: all kind-specific config
// (status options, which status counts as done, labels) and every write come in as props.
export default function CategorizedList({
  categories, items, nameLabel, statusOptions, doneStatus, readOnly = false,
  onStatusChange, onItemClick, onItemDelete, onItemsReorder,
  onAddItem, onRenameCategory, onMoveCategory, onDeleteCategory,
}) {
  const { t, locale, currency } = useI18n();
  const [collapsed, setCollapsed] = useState(new Set());

  const grouped = categories.map((s) => ({ ...s, items: items.filter((e) => e.category_id === s.id) }));
  // Virtual bucket: items with null or orphaned (deleted-category) category_id.
  const liveIds = new Set(categories.map((c) => c.id));
  const uncategorizedItems = items.filter((e) => !e.category_id || !liveIds.has(e.category_id));

  const toggleCollapsed = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId !== destination.droppableId || source.index === destination.index) return;
    const catId = source.droppableId;
    const reordered = items.filter((e) => e.category_id === catId);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    onItemsReorder(catId, reordered.map((e, i) => ({ ...e, position: i })));
  };

  const totals = (xs) => ({
    total: xs.reduce((s, e) => s + e.amount, 0),
    done: xs.filter((e) => e.status === doneStatus).reduce((s, e) => s + e.amount, 0),
  });

  const header = ({ id, name, rows, dot, actions }) => {
    const { total, done } = totals(rows);
    return (
      <tbody>
        <tr className="border-t-2 border-slate-200 dark:border-zinc-700 bg-slate-200/70 dark:bg-zinc-700/60">
          <td className="py-2.5 px-3">{dot}</td>
          <td className="py-2.5 px-3 font-bold text-slate-600 dark:text-zinc-300 tracking-widest uppercase">
            <span className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleCollapsed(id); }}
                className="inline-flex items-center justify-center w-4 h-4 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
              >
                <ChevronDown size={10} className={cn("transition-transform", collapsed.has(id) && "-rotate-90")} />
              </button>
              {name}
              <span className="text-[10px] font-normal text-slate-400 dark:text-zinc-600 normal-case tracking-normal">· {rows.length} {t("category.items")}</span>
              <span className="hidden sm:block w-20">
                <ProgressBar value={done} max={total} tone="positive" height="h-1" />
              </span>
            </span>
          </td>
          <td className="py-2.5 px-3 text-right font-mono text-slate-500 dark:text-zinc-400">{fmt(total, locale, currency)}</td>
          <td className="py-2.5 px-3 text-center">
            {!readOnly && actions && <RowActions items={actions} />}
          </td>
        </tr>
      </tbody>
    );
  };

  const deleteBtn = (e) => (
    <button
      aria-label={t("actions.delete")}
      onClick={() => onItemDelete(e)}
      className="inline-flex items-center justify-center w-4 h-4 rounded text-slate-300 dark:text-zinc-600 hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
    >
      <Trash2 size={10} />
    </button>
  );

  const cells = (e) => (
    <>
      <td className="py-1.5 px-3 text-slate-700 dark:text-zinc-300">{e.name}</td>
      <td className={cn("py-1.5 px-3 text-right font-mono font-semibold", e.amount === 0 ? TONE.meta : TONE.neutral)}>
        {fmt(e.amount, locale, currency)}
      </td>
      <td className="py-1.5 px-3 text-center" onClick={(ev) => ev.stopPropagation()}>
        <StatusPicker status={e.status} options={statusOptions} onChange={(v) => onStatusChange(e.id, v)} />
      </td>
    </>
  );

  const rowCls = (i, extra) => cn(
    "group border-b border-slate-100 dark:border-zinc-800/60 transition-colors",
    i % 2 === 1 && "bg-slate-50/50 dark:bg-zinc-800/30",
    !readOnly && "hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 cursor-pointer",
    extra
  );

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-200 dark:border-zinc-800">
          <th className="w-8 py-2 px-3" />
          <th className="text-left py-2 px-3 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-medium">{nameLabel}</th>
          <th className="text-right py-2 px-3 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-medium w-36">{t("col.value")}</th>
          <th className="text-center py-2 px-3 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-medium w-16">{t("col.status")}</th>
        </tr>
      </thead>
      <DragDropContext onDragEnd={handleDragEnd}>
        {grouped.map((sec, si) => (
          <Fragment key={sec.id}>
            {header({
              id: sec.id, name: sec.name, rows: sec.items,
              dot: <span style={{ background: SECTION_COLORS[si % SECTION_COLORS.length] }} className="inline-block w-2 h-2 rounded-full" />,
              actions: [
                { label: t("actions.add"), icon: Plus, onClick: () => onAddItem(sec.id) },
                { label: t("actions.rename"), icon: Pencil, onClick: () => onRenameCategory(sec) },
                { label: t("actions.moveUp"), icon: ArrowUp, onClick: () => onMoveCategory(sec.id, -1), disabled: si === 0 },
                { label: t("actions.moveDown"), icon: ArrowDown, onClick: () => onMoveCategory(sec.id, 1), disabled: si === grouped.length - 1 },
                { label: t("actions.delete"), icon: Trash2, tone: "danger", onClick: () => onDeleteCategory(sec) },
              ],
            })}
            {!collapsed.has(sec.id) && <Droppable droppableId={sec.id} isDropDisabled={readOnly}>
              {(droppableProvided) => (
                <tbody ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
                  {sec.items.map((e, i) => (
                    <Draggable key={e.id} draggableId={e.id} index={i} isDragDisabled={readOnly}>
                      {(draggableProvided, snapshot) => (
                        <tr
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          onClick={() => !readOnly && !snapshot.isDragging && onItemClick(e)}
                          className={rowCls(i, snapshot.isDragging && "bg-emerald-50 dark:bg-emerald-950/20 shadow-md")}>
                          <td className="py-1.5 pl-3 pr-0 w-px" onClick={(ev) => ev.stopPropagation()}>
                            <span className="flex items-center gap-1">
                              {!readOnly && (
                                <span
                                  {...draggableProvided.dragHandleProps}
                                  className="inline-flex items-center justify-center w-4 h-4 text-slate-300 dark:text-zinc-600 hover:text-slate-500 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical size={10} />
                                </span>
                              )}
                              {!readOnly && deleteBtn(e)}
                            </span>
                          </td>
                          {cells(e)}
                        </tr>
                      )}
                    </Draggable>
                  ))}
                  {droppableProvided.placeholder}
                </tbody>
              )}
            </Droppable>}
          </Fragment>
        ))}
        {uncategorizedItems.length > 0 && (
          <Fragment key={UNCATEGORIZED_ID}>
            {header({
              id: UNCATEGORIZED_ID, name: t("category.uncategorized"), rows: uncategorizedItems,
              dot: <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-600" />,
            })}
            {!collapsed.has(UNCATEGORIZED_ID) && (
              <tbody>
                {uncategorizedItems.map((e, i) => (
                  <tr key={e.id} onClick={() => !readOnly && onItemClick(e)} className={rowCls(i)}>
                    <td className="py-1.5 pl-3 pr-0 w-px" onClick={(ev) => ev.stopPropagation()}>
                      {!readOnly && deleteBtn(e)}
                    </td>
                    {cells(e)}
                  </tr>
                ))}
              </tbody>
            )}
          </Fragment>
        )}
      </DragDropContext>
    </table>
  );
}
