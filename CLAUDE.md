# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**money-app** is a React/Vite financial management web application with three main features:
1. **Expenses** — Monthly expense management grouped by user-defined categories, with per-month payment status and amounts
2. **Splitter** — Splits income and expenses across people by share, with per-person totals
3. **DebtKiller** — Debt and loan tracking with payments, payment distribution, and progress donuts

Data persists in the backend (Supabase) via the REST client in `src/api.js` (base URL `http://localhost:8000`). The backend must be running for the app to load data. localStorage is used only for UI preferences (language and theme), not financial data.

## Common Commands

```bash
# Start development server (Vite dev server on http://localhost:5173)
npm run dev

# Build for production (outputs to /dist)
npm run build

# Preview production build locally
npm run preview

# Install dependencies
npm install
```

## Project Structure

```
src/
├── App.jsx                    # App shell: sidebar nav, tab switching, preferences modal
├── main.jsx                   # React entry point (wraps app in I18nProvider)
├── index.css                  # Global styles + Tailwind imports
├── api.js                     # Backend REST client (all fetch calls live here)
├── storage.js                 # Thin window.storage wrapper over localStorage (prefs only)
├── features/
│   ├── expenses/Expenses.jsx      # Expenses feature (~593 lines)
│   ├── splitter/Splitter.jsx      # Splitter feature (~802 lines)
│   └── debtKiller/DebtKiller.jsx  # DebtKiller feature (~770 lines)
├── components/
│   ├── Modal.jsx              # Generic modal dialog
│   ├── Btn.jsx                # Button with variants/sizes
│   ├── StatusPicker.jsx       # Expense status selector + AMOUNT_CLS export
│   └── MonthYearPicker.jsx    # Month/year navigation picker
├── i18n/
│   ├── index.jsx             # I18nProvider + useI18n hook (lang, theme, t, locale, currency)
│   ├── es.json               # Spanish strings (default)
│   └── en.json               # English strings
└── lib/
    └── utils.js              # cn(), toMonthKey(), fmt(), fmtMonth()
```

## Architecture

### App Shell (App.jsx)

`App.jsx` is the shell only (~177 lines): sidebar navigation, collapsible/mobile drawer, tab switching between the three features, and the preferences modal (language + theme). Each tab renders a feature component from `src/features/`. Feature components are independent and self-contained; each fetches its own data from `api.js` on mount.

### API Client (api.js)

All backend calls go through `src/api.js`. Base URL is hardcoded to `http://localhost:8000`. Notable conventions:
- `mapExpense()` maps backend fields (`expense`, `value`) to frontend fields (`name`, `amount`).
- Most list endpoints return `{ <plural>: [...] }`; the client unwraps with `data.x ?? data`.
- `USER_ID = "default"` is sent as a query param or body field for user-scoped resources.
- Functions cover CRUD + reorder for categories/expenses, expense-status upsert, splitter items, people (with feature association), and debts/payments (including `distributePayment`).

### Feature components

- **Expenses** — categories + expenses fetched per month (`monthKey`). Drag-and-drop reorder via `@hello-pangea/dnd`. Per-month status/amount via `upsertExpenseStatus`. Past months are read-only. Inline editing of names, amounts, status, and categories.
- **Splitter** — income/expense rows split across people by share. Uses `fetchPeople(feature)` for the splitter feature. Camera capture to PNG.
- **DebtKiller** — debts and loans with payment history, progress donuts (`LoanDonut`), and `distributePayment` to spread one payment across active debts. Person filtering.

### Data Storage

- Financial data lives in the backend (Supabase), accessed only through `api.js`.
- `storage.js` is a thin async wrapper over `localStorage`, used for UI state only.
- UI preferences persist directly to localStorage: `app-language` and `app-theme` (set in `i18n/index.jsx`).

### Styling

- **Framework:** Tailwind CSS with PostCSS
- **Color scheme:** Greens (paid/income), reds (unpaid/outflow), blues (actions), grays (neutral)
- **Responsive:** Mobile-first with breakpoint-specific sidebar behavior (hidden on mobile, collapsible on desktop)

## Key Design Patterns

1. **Backend-Backed State** — Features fetch from `api.js` on mount and re-fetch after mutations; no client-side master store
2. **Month-as-Key** — Expenses indexed by `toMonthKey()` (YYYY-MM); status/amount stored per month
3. **Read-Only Past Months** — Current month (derived from `new Date()`) is editable; others are read-only
4. **Drag-to-Reorder** — Drag within/between categories via `@hello-pangea/dnd`; persisted with `reorderExpenses`/`reorderCategories`
5. **Self-Contained Features** — Each feature owns its data fetching, loading/error state, and modals

## i18n & Theme

- **`I18nProvider`** wraps the app in `main.jsx`; consume via `useI18n()` hook
- **`t(key)`** — looks up translation key; falls back to Spanish, then the key itself
- **Language toggle** — `es` (default, COP) / `en` (USD); persisted to `localStorage["app-language"]`
- **Theme toggle** — `light` / `dark`; persisted to `localStorage["app-theme"]`; applied via `document.documentElement.classList` (`dark` class for Tailwind dark mode)
- **`locale` / `currency`** — derived from `lang` and passed through context for use in `Intl.NumberFormat`
- Add new strings to both `es.json` and `en.json` when adding UI text

## Locale & Formatting

- **Currency:** Colombian Pesos (COP, no decimals) in Spanish mode; USD in English mode
- **Month Display:** Long format in Spanish (e.g., "MARZO 2025")

## Notable Implementation Details

- **Backend required** — Features show loading/error state if `http://localhost:8000` is unreachable
- **Field mapping** — `api.js` `mapExpense()` translates backend `expense`/`value` to frontend `name`/`amount`
- **Date comparison for read-only mode** — uses `toMonthKey()` string comparison (works because format is YYYY-MM)
- **PNG capture** — Splitter and DebtKiller can export a view as a PNG image



--- 

# Core Rules

Short sentences only (8-10 words max).
No filler, no preamble, no pleasantries.
Tool first. Result first. No explain unless asked.
Code stays normal. English gets compressed.

## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

## Formatting

Output sounds human. Never AI-generated.
Never use em-dashes or replacement hyphens.
Avoid parenthetical clauses entirely.
Hyphens map to standard grammar only.