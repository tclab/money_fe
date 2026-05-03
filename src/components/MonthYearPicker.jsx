import { useState } from "react";
import { cn } from "../lib/utils.js";

export default function MonthYearPicker({ pos, dropRef, viewDate, onSelect }) {
  const now = new Date();
  const [year, setYear] = useState(viewDate.getFullYear());
  const months = Array.from({ length: 12 }, (_, i) => i);
  const years = Array.from({ length: now.getFullYear() - 2019 + 2 }, (_, i) => 2020 + i);

  return (
    <div
      ref={dropRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl p-3 w-52"
    >
      <div className="mb-2">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full text-xs font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-0 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {months.map((m) => {
          const label = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(new Date(2000, m, 1)).toUpperCase();
          const isActive = viewDate.getMonth() === m && viewDate.getFullYear() === year;
          return (
            <button
              key={m}
              onClick={() => onSelect(new Date(year, m, 1))}
              className={cn(
                "text-[10px] font-mono py-1.5 rounded-lg transition-colors",
                isActive
                  ? "bg-emerald-500 text-white font-bold"
                  : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
