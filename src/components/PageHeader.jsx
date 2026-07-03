import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import { cn, fmtMonth } from "../lib/utils.js";
import { SURFACE, TONE, TYPE } from "../lib/tokens.js";
import MonthYearPicker from "./MonthYearPicker.jsx";

const stepMonth = (d, delta) => new Date(d.getFullYear(), d.getMonth() + delta, 1);

// One header shell for every module. Left: optional month pill + title + meta.
// Right: metric group + primary action.
// Props:
//   viewDate, onSelectMonth  -> enable the month pill (omit both to hide it, e.g. Debts)
//   title (string), meta (node)
//   metrics: [{ label, value, tone }]  tone keys TONE (positive/negative/pending/neutral)
//   action: node (primary Btn / menu)
export default function PageHeader({ viewDate, onSelectMonth, title, meta, metrics = [], action }) {
  const { lang } = useI18n();
  const [pickerPos, setPickerPos] = useState(null);
  const brandRef = useRef();
  const pickerDropRef = useRef();
  const hasMonth = viewDate && onSelectMonth;

  useEffect(() => {
    if (!pickerPos) return;
    const handler = (e) => {
      if (!brandRef.current?.contains(e.target) && !pickerDropRef.current?.contains(e.target)) setPickerPos(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerPos]);

  const openPicker = (e) => {
    e.stopPropagation();
    if (pickerPos) { setPickerPos(null); return; }
    const r = brandRef.current.getBoundingClientRect();
    setPickerPos({ top: r.bottom + 6, left: r.left });
  };

  return (
    <div className={cn(SURFACE, "rounded-xl px-6 py-4 flex flex-wrap justify-between items-start gap-4")} style={{ fontVariantNumeric: "tabular-nums" }}>
      <div>
        {hasMonth ? (
          <div className="flex items-center gap-1.5">
            <button onClick={() => onSelectMonth(stepMonth(viewDate, -1))}
              className="grid place-items-center h-7 w-7 rounded-md border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              <ChevronLeft size={13} />
            </button>
            <button ref={brandRef} onClick={openPicker}
              className="flex items-center gap-2 h-7 rounded-md border border-slate-200 dark:border-zinc-800 px-3 text-[11px] font-mono tracking-widest text-slate-500 dark:text-zinc-300 uppercase hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors select-none">
              {fmtMonth(viewDate, lang === "en" ? "en-US" : "es-ES")}
              <ChevronDown size={11} className={cn("text-slate-400 dark:text-zinc-500 transition-transform", pickerPos && "rotate-180")} />
            </button>
            <button onClick={() => onSelectMonth(stepMonth(viewDate, 1))}
              className="grid place-items-center h-7 w-7 rounded-md border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              <ChevronRight size={13} />
            </button>
          </div>
        ) : null}
        <div className={cn(TYPE.title, "text-slate-900 dark:text-zinc-50 font-mono mt-2")}>{title}</div>
        {meta && <div className={cn(TYPE.body, "text-slate-400 dark:text-zinc-500 mt-0.5")}>{meta}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono w-full sm:w-auto">
        {metrics.map((m, i) => (
          <div key={i} className="text-right">
            <div className={TYPE.label}>{m.label}</div>
            <div className={cn("text-base sm:text-xl font-semibold mt-0.5", TONE[m.tone] || TONE.neutral)}>{m.value}</div>
          </div>
        ))}
        {action}
      </div>

      {hasMonth && pickerPos && (
        <MonthYearPicker pos={pickerPos} dropRef={pickerDropRef} viewDate={viewDate}
          onSelect={(d) => { onSelectMonth(d); setPickerPos(null); }} />
      )}
    </div>
  );
}
