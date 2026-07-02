import { useState, useEffect, useRef } from "react";
import { useI18n } from "../i18n/index.jsx";
import { cn } from "../lib/utils.js";
import { AMOUNT_CLS } from "../lib/tokens.js";

export { AMOUNT_CLS };

// Solid = done, hollow = to-do. Per redesign spec section D: paid/received render a
// solid emerald check; everything pending renders a hollow ring in its tone color.
export const STATUS_ICON = {
  paid:      { ch: "✓", cls: "text-white bg-emerald-500 border border-emerald-500" },
  received:  { ch: "✓", cls: "text-white bg-emerald-500 border border-emerald-500" },
  unpaid:    { ch: "",  cls: "text-rose-400 border border-dashed border-rose-400" },
  expected:  { ch: "",  cls: "text-amber-400 border border-dashed border-amber-400" },
  verify:    { ch: "!", cls: "text-amber-400 bg-amber-500/10 border border-amber-500/40" },
  scheduled: { ch: "◷", cls: "text-amber-400 bg-amber-500/10 border border-amber-500/40" },
};

// Statuses offered in the dropdown, scoped per feature so income and expenses
// do not show each other's options.
const EXPENSE_STATUSES = ["paid", "unpaid", "scheduled", "verify"];

export default function StatusPicker({ status, onChange, options = EXPENSE_STATUSES }) {
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

  const si = STATUS_ICON[status] || STATUS_ICON[options[0]] || STATUS_ICON.unpaid;

  return (
    <div className="flex items-center justify-center">
      <button ref={btnRef} onClick={handleOpen}
        className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold hover:opacity-75 transition-opacity", si.cls)}
      >
        {si.ch}
      </button>
      {open && pos && (
        <div ref={dropRef} style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl py-0.5 min-w-[110px]">
          {options.map((s) => { const cfg = STATUS_ICON[s]; return (
            <button key={s}
              onMouseDown={(e) => { e.stopPropagation(); onChange(s); setPos(null); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left",
                s === status ? "opacity-100" : "opacity-60 hover:opacity-100"
              )}
            >
              <span className={cn("inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold shrink-0", cfg.cls)}>{cfg.ch}</span>
              <span className="text-slate-700 dark:text-zinc-200 font-mono">{t(`status.${s}`)}</span>
            </button>
          ); })}
        </div>
      )}
    </div>
  );
}
