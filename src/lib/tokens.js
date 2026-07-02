// Semantic design tokens. Color encodes STATE, not which page you are on.
// Import these instead of hardcoding per-page colors.

// Amount / text tone by meaning.
export const TONE = {
  positive: "text-emerald-600 dark:text-emerald-400", // paid, received, money-in, surplus
  negative: "text-rose-600 dark:text-rose-400",       // unpaid, overdue, remaining, money-out
  pending:  "text-amber-600 dark:text-amber-400",     // expected, scheduled, to-receive
  neutral:  "text-slate-700 dark:text-zinc-300",      // plain amount, $0
  meta:     "text-slate-400 dark:text-zinc-500",      // labels, counts, captions
};

// Progress-bar fill background by tone.
export const BAR_BG = {
  positive: "bg-emerald-500",
  negative: "bg-rose-500",
  pending:  "bg-amber-400",
  neutral:  "bg-slate-300 dark:bg-zinc-600",
};

// Standard card surface.
export const SURFACE =
  "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800";

// Section swatch palette (moved from the duplicated arrays in Expenses/Income).
export const SECTION_COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa"];

// Amount text color keyed by status. Missing / no status falls back to neutral at
// the call site. Sourced here so StatusPicker and features stay consistent.
export const AMOUNT_CLS = {
  paid:      TONE.positive,
  unpaid:    TONE.negative,
  scheduled: "text-blue-600 dark:text-blue-400",
  verify:    TONE.pending,
  received:  TONE.positive,
  expected:  TONE.pending,
};
