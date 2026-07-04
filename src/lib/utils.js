import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SECTION_COLORS } from "./tokens.js";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Stable dot color for a category id, hashed into SECTION_COLORS.
// Same id always yields the same swatch.
export const catColor = (id) => {
  const s = String(id ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) % SECTION_COLORS.length;
  return SECTION_COLORS[h];
};

export const toMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Local YYYY-MM-DD (avoids the UTC shift of toISOString).
export const toDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fmt = (n, locale = "es-CO", currency = "COP") =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0 }).format(n || 0);

export const fmtMonth = (date, locale = "es-ES") =>
  new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date).toUpperCase();
