import { cn } from "../lib/utils.js";
import { BAR_BG } from "../lib/tokens.js";

// Always renders an empty track plus a real fill, so 0% reads as empty (not full).
export default function ProgressBar({ value = 0, max = 0, tone = "positive", className, height = "h-2" }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800", height, className)}>
      <div className={cn("h-full rounded-full transition-all", BAR_BG[tone] || BAR_BG.positive)} style={{ width: `${pct}%` }} />
    </div>
  );
}
