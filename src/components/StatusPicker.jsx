import { useState, useEffect, useRef } from "react";
import { useI18n } from "../i18n/index.jsx";
import { cn } from "../lib/utils.js";

export const STATUS_ICON = {
  paid:      { ch: "✓", cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30" },
  unpaid:    { ch: "×", cls: "text-rose-400 bg-rose-500/10 border border-rose-500/30" },
  scheduled: { ch: "◷", cls: "text-blue-400 bg-blue-500/10 border border-blue-500/30" },
  verify:    { ch: "!", cls: "text-amber-400 bg-amber-500/10 border border-amber-500/30" },
};

export const AMOUNT_CLS = {
  paid:      "text-emerald-600 dark:text-emerald-400",
  unpaid:    "text-rose-600 dark:text-rose-400",
  scheduled: "text-blue-600 dark:text-blue-400",
  verify:    "text-amber-600 dark:text-amber-400",
};

export default function StatusPicker({ status, onChange }) {
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
