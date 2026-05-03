import { cn } from "../lib/utils.js";

export default function Btn({ onClick, variant = "default", size = "sm", className, children, disabled }) {
  const base = "inline-flex items-center gap-1.5 font-mono font-medium rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2", icon: "p-2" };
  const variants = {
    default: "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700",
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/20",
    danger: "bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60",
    ghost: "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={cn(base, sizes[size], variants[variant], className)}>
      {children}
    </button>
  );
}
