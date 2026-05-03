import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const toMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const fmt = (n, locale = "es-CO", currency = "COP") =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0 }).format(n || 0);

export const fmtMonth = (date, locale = "es-ES") =>
  new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date).toUpperCase();
