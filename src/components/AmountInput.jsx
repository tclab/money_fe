import { useState } from "react";
import { cn } from "../lib/utils.js";

// Default styling matches the amount inputs used across the feature modals.
const BASE = "w-full border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right";

// Keep numeric characters plus a single decimal separator.
function sanitize(raw) {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
}

/**
 * Single always-mounted amount input. Shows formatted currency when blurred and
 * a raw editable number when focused, without swapping elements — so a mobile tap
 * is a trusted gesture and the numeric keyboard opens. `inputMode="decimal"` is a
 * mobile-only hint; desktop ignores it.
 *
 * Emits a number by default, or a raw string when `asString` is set (some callers
 * store the value as a string and parseFloat it later).
 */
export default function AmountInput({
  value,
  onChange,
  onEnter,
  asString = false,
  format,
  placeholder = "0",
  className,
  autoFocus = false,
  emptyValue = asString ? "" : 0,
}) {
  const [focused, setFocused] = useState(false);

  const isEmpty = value === "" || value === null || value === undefined || (!asString && value === 0);
  const rawStr = isEmpty ? "" : String(value);
  const display = focused
    ? rawStr
    : isEmpty
      ? ""
      : (format ? format(Number(value)) : rawStr);

  const handleChange = (e) => {
    const clean = sanitize(e.target.value);
    if (clean === "") {
      onChange(emptyValue);
    } else if (asString) {
      onChange(clean);
    } else {
      onChange(parseFloat(clean) || 0);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*"
      value={display}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={handleChange}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
      className={cn(BASE, className)}
    />
  );
}
