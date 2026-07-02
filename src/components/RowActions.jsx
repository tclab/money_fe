import { useState, useEffect, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "../lib/utils.js";

// A single ⋯ menu replacing inline icon clusters (add / rename / move / delete).
// items: array of { label, icon: LucideComponent, onClick, tone?: "danger", disabled? }
export default function RowActions({ items = [], className }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef();
  const dropRef = useRef();
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!btnRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) setPos(null);
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

  return (
    <div className={cn("inline-flex", className)}>
      <button ref={btnRef} onClick={handleOpen}
        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors">
        <MoreHorizontal size={14} />
      </button>
      {open && pos && (
        <div ref={dropRef} style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl py-0.5 min-w-[150px]">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <button key={i} disabled={it.disabled}
                onMouseDown={(e) => { e.stopPropagation(); if (it.disabled) return; setPos(null); it.onClick(); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium text-left transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
                  it.tone === "danger"
                    ? "text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    : "text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
                )}>
                {Icon && <Icon size={13} className="shrink-0" />} {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
