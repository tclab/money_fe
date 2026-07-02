import { useState, useEffect, useRef } from "react";
import { ImageDown, ClipboardCopy, ChevronDown, Cloud, Check } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import { cn } from "../lib/utils.js";

// Dropdown that exposes both capture actions: download a PNG or copy it to the clipboard.
// onSelect is called with "image" or "clipboard". status drives trigger feedback.
export default function ReportMenu({ onSelect, disabled = false, status = "idle", label }) {
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

  const pick = (mode) => { setPos(null); onSelect(mode); };

  const options = [
    { mode: "image", Icon: ImageDown, label: t("btn.saveImage") },
    { mode: "clipboard", Icon: ClipboardCopy, label: t("btn.copyClipboard") },
  ];

  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        disabled={disabled || status === "generating"}
        className={cn(
          "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-mono font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed",
          status === "copied"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            : "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300"
        )}>
        {status === "generating" ? (
          <><Cloud size={14} className="animate-pulse" /> {t("btn.generating")}</>
        ) : status === "copied" ? (
          <><Check size={14} /> {t("btn.copied")}</>
        ) : (
          <><ImageDown size={14} /> {label ?? t("btn.report")} <ChevronDown size={12} className="opacity-60" /></>
        )}
      </button>
      {open && pos && (
        <div ref={dropRef} style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl py-0.5 min-w-[180px]">
          {options.map(({ mode, Icon, label: optLabel }) => (
            <button key={mode}
              onMouseDown={(e) => { e.stopPropagation(); pick(mode); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left text-slate-700 dark:text-zinc-200 font-mono">
              <Icon size={13} className="shrink-0 text-slate-400 dark:text-zinc-500" />
              {optLabel}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
