import { useState, useEffect } from "react";
import { Cloud, TrendingUp } from "lucide-react";
import { useI18n } from "../../i18n/index.jsx";
import { cn, toMonthKey, fmt } from "../../lib/utils.js";
import { TYPE } from "../../lib/tokens.js";
import { fetchIncome, fetchExpenses, fetchCategories } from "../../api.js";
import PageHeader from "../../components/PageHeader.jsx";
import ProgressBar from "../../components/ProgressBar.jsx";

const sum = (rows) => rows.reduce((s, r) => s + (r.amount || 0), 0);

// Group rows by category_id, join to category name, sort desc by total.
function breakdown(rows, categories) {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const totals = new Map();
  for (const r of rows) {
    totals.set(r.category_id, (totals.get(r.category_id) || 0) + (r.amount || 0));
  }
  return [...totals.entries()]
    .map(([id, total]) => ({ id, name: nameById.get(id) || "—", total }))
    .sort((a, b) => b.total - a.total);
}

export default function Dashboard() {
  const { t, locale, currency } = useI18n();
  const today = new Date();
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomeCats, setIncomeCats] = useState([]);
  const [expenseCats, setExpenseCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewDate, setViewDate] = useState(today);

  const monthKey = toMonthKey(viewDate);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchIncome(null, monthKey),
      fetchExpenses(null, monthKey),
      fetchCategories("income"),
      fetchCategories("expense"),
    ]).then(([inc, exp, incCats, expCats]) => {
      setIncome(inc);
      setExpenses(exp);
      setIncomeCats(incCats);
      setExpenseCats(expCats);
      setLoading(false);
    }).catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  }, [monthKey]);

  const incomeTotal = sum(income);
  const expenseTotal = sum(expenses);
  const net = incomeTotal - expenseTotal;
  const savingsRate = incomeTotal > 0 ? net / incomeTotal : 0;
  const savingsPct = Math.max(0, Math.min(100, savingsRate * 100));

  const received = sum(income.filter((e) => e.status === "received"));
  const expected = incomeTotal - received;
  const receivedPct = incomeTotal > 0 ? (received / incomeTotal) * 100 : 0;

  const paid = sum(expenses.filter((e) => e.status === "paid"));
  const pending = expenseTotal - paid;
  const paidPct = expenseTotal > 0 ? (paid / expenseTotal) * 100 : 0;

  const incomeBreakdown = breakdown(income, incomeCats);
  const expenseBreakdown = breakdown(expenses, expenseCats);

  const positive = net >= 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500">
      <Cloud size={28} className="animate-pulse mr-2" /> {t("state.loading")}
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64 text-rose-400 dark:text-rose-500 text-sm font-mono">
      {error}
    </div>
  );

  const CARD = "rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900";
  const LABEL = cn(TYPE.label, "font-mono");

  const savedPctLabel = `${savingsRate >= 0 ? "" : "-"}${Math.abs(savingsRate * 100).toFixed(1)}%`;

  return (
    <div className="animate-fade-in space-y-4" style={{ fontVariantNumeric: "tabular-nums" }}>
      <PageHeader
        viewDate={viewDate} onSelectMonth={setViewDate}
        title={t("dashboard.title")}
        meta={t("dashboard.savedThisMonth").replace("{pct}", savedPctLabel)}
        metrics={[
          { label: t("dashboard.netThisMonth"), value: `${positive ? "+" : "-"}${fmt(Math.abs(net), locale, currency)}`, tone: positive ? "positive" : "negative" },
          { label: t("dashboard.savingsRate"), value: `${(savingsRate * 100).toFixed(1)}%`, tone: "neutral" },
        ]}
      />

      {/* Hero: savings rate + net */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className={cn(CARD, "lg:col-span-3 p-6")}>
          <div className={LABEL}>{t("dashboard.savingsRate")}</div>
          <div className="mt-2 flex items-end gap-3">
            <span className={cn("font-mono text-6xl font-bold tracking-tight", positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {(savingsRate * 100).toFixed(1)}<span className="text-3xl align-top">%</span>
            </span>
            <span className={cn("mb-2", TYPE.body, "text-slate-500 dark:text-zinc-400")}>{t("dashboard.ofIncomeKept")}</span>
          </div>
          <ProgressBar value={savingsPct} max={100} tone={positive ? "positive" : "negative"} height="h-2.5" className="mt-4" />
          <p className={cn("mt-3", TYPE.body, "text-slate-500 dark:text-zinc-400")}>
            {t("dashboard.netOfEarned")
              .replace("{net}", fmt(net, locale, currency))
              .replace("{income}", fmt(incomeTotal, locale, currency))}
          </p>
        </div>
        <div className={cn(
          "lg:col-span-2 p-6 rounded-xl border flex flex-col justify-between",
          positive
            ? "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/50 dark:bg-emerald-500/[0.06]"
            : "border-rose-200 dark:border-rose-500/25 bg-rose-50/50 dark:bg-rose-500/[0.06]"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em] font-mono", positive ? "text-emerald-700/70 dark:text-emerald-400/70" : "text-rose-700/70 dark:text-rose-400/70")}>
              {t("dashboard.netThisMonth")}
            </span>
            <TrendingUp size={16} className={positive ? "text-emerald-500" : "text-rose-500 rotate-180"} />
          </div>
          <div className={cn("mt-3", TYPE.hero, positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {positive ? "+" : "-"}{fmt(Math.abs(net), locale, currency)}
          </div>
          <p className={cn("mt-4", TYPE.body, "leading-relaxed text-slate-500 dark:text-zinc-400")}>
            {positive ? t("dashboard.netPositive") : t("dashboard.netNegative")}
          </p>
        </div>
      </div>

      {/* KPI: income / expenses */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={cn(CARD, "p-5")}>
          <div className="flex items-center justify-between">
            <span className={LABEL}>{t("dashboard.income")}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-800 dark:text-zinc-100">{fmt(incomeTotal, locale, currency)}</div>
          <div className={cn("mt-1", TYPE.body, "text-slate-500 dark:text-zinc-400")}>
            {income.length} {t("income.transactions")} · {incomeCats.length} {t("income.sources")}
          </div>
        </div>
        <div className={cn(CARD, "p-5")}>
          <div className="flex items-center justify-between">
            <span className={LABEL}>{t("dashboard.expenses")}</span>
            <span className="h-2 w-2 rounded-full bg-rose-500" />
          </div>
          <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-800 dark:text-zinc-100">{fmt(expenseTotal, locale, currency)}</div>
          <div className={cn("mt-1", TYPE.body, "text-slate-500 dark:text-zinc-400")}>
            {expenses.length} {t("expenses.transactions")} · {expenseCats.length} {t("expenses.categories")}
          </div>
        </div>
      </div>

      {/* Settled this month */}
      <div className={CARD}>
        <div className="border-b border-slate-200 dark:border-zinc-800 px-6 py-4">
          <span className={cn(TYPE.label, "font-mono")}>{t("dashboard.settled")}</span>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2 font-mono">
          {/* income received vs expected */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">{t("dashboard.incomeReceived")}</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-200">{receivedPct.toFixed(1)}%</span>
            </div>
            <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
              <div className="h-full bg-emerald-500" style={{ width: `${receivedPct}%` }} />
              <div className="h-full bg-amber-400/70" style={{ width: `${100 - receivedPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" />{t("status.received")} {fmt(received, locale, currency)}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-400/70" />{t("status.expected")} {fmt(expected, locale, currency)}</span>
            </div>
          </div>
          {/* expenses paid vs pending */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">{t("dashboard.expensesPaid")}</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-200">{paidPct.toFixed(1)}%</span>
            </div>
            <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
              <div className="h-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
              <div className="h-full bg-rose-400/70" style={{ width: `${100 - paidPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" />{t("status.paid")} {fmt(paid, locale, currency)}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-rose-400/70" />{t("expenses.pending")} {fmt(pending, locale, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title={t("dashboard.whereFrom")} total={incomeTotal} rows={incomeBreakdown}
          tone="positive" locale={locale} currency={currency} card={CARD}
          empty={t("dashboard.noIncome")} />
        <BreakdownCard
          title={t("dashboard.whereWent")} total={expenseTotal} rows={expenseBreakdown}
          tone="negative" locale={locale} currency={currency} card={CARD}
          empty={t("dashboard.noExpenses")} />
      </div>
    </div>
  );
}

function BreakdownCard({ title, total, rows, tone, locale, currency, card, empty }) {
  return (
    <div className={card}>
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 px-6 py-4">
        <span className={cn(TYPE.label, "font-mono")}>{title}</span>
        <span className="font-mono text-xs text-slate-400 dark:text-zinc-500">{fmt(total, locale, currency)}</span>
      </div>
      <div className="space-y-3.5 px-6 py-5">
        {rows.length === 0 && <div className="text-xs text-slate-400 dark:text-zinc-500 font-mono">{empty}</div>}
        {rows.map((r) => (
          <div key={r.id}>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-slate-700 dark:text-zinc-200">{r.name}</span>
              <span className="font-mono text-slate-500 dark:text-zinc-400">{fmt(r.total, locale, currency)}</span>
            </div>
            <ProgressBar value={r.total} max={total} tone={tone} height="h-1.5" className="mt-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
