# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**money-app** is a React/Vite financial management web application with two main features:
1. **Expense Tracker (Gastos)** — Monthly expense management with categories (FIJOS, TARJETAS, APTOS) and payment status tracking
2. **Cash Flow Tracker (Flujo de Caja)** — Cash flow management including entries, exits, discounts, loans, and payment schedules

The app uses **localStorage** for data persistence with a custom storage abstraction layer. All data is local-only (no backend API). Users can export/import data as JSON files.

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
├── App.jsx           # Main app shell with routing logic and data import/export
├── main.jsx          # React entry point
├── index.css         # Global styles + Tailwind imports
├── storage.js        # localStorage abstraction (window.storage API)
├── i18n/
│   ├── index.jsx     # I18nProvider + useI18n hook (language, theme, t())
│   ├── es.json       # Spanish strings (default)
│   └── en.json       # English strings
└── lib/
    └── utils.js      # cn() utility (clsx + tailwind-merge)
```

## Architecture

### Single-File Component (App.jsx)

The entire application is contained in a single JSX file (~930 lines). It's organized into logical sections separated by comment headers:

1. **Shared Utilities** (lines 6-27)
   - Date formatting: `toMonthKey()` converts dates to YYYY-MM format for storage keys
   - Currency formatting: `fmt()` formats numbers as Colombian Pesos (COP)
   - Export function: `exportData()` downloads data as JSON file

2. **ImportExportBar Component** (lines 29-88)
   - Handles data export (download JSON) and import (upload JSON) with confirmation dialogs
   - Re-initializes tracker state when importing

3. **AmountInput Component** (lines 90-104)
   - Dual-mode input field that displays formatted currency when not editing
   - Switches to number input on focus for raw number entry

4. **ExpenseTracker Component** (lines 106-373)
   - Main expense management feature
   - **State:**
     - `allMonths` — nested structure: `{ "2025-03": { "FIJOS": [...], "TARJETAS": [...], "APTOS": [...] } }`
     - `viewDate` — currently displayed month
     - `syncStatus` — UI feedback for save operations
   - **Features:**
     - Drag-and-drop reordering within/between categories
     - Read-only mode for past months
     - Expense status tracking (Pagado, No pagado, Programado, Verificar)
     - Editable expense name, amount, and status in current month
     - Auto-saves on every change via `window.storage.set()`

5. **FlujoCaja Component** (lines 375-847)
   - Cash flow and loan tracking feature
   - **State:**
     - `entradas` — income entries
     - `salidas` — expense entries
     - `descuentos` — deductions (e.g., "Menos 201", "Menos préstamo")
     - `prestamos` — loans with concept and payment tracking
   - **Features:**
     - Calculates neto (net), C/U (per unit), and running totals
     - Dynamic table generation with add/delete buttons for each section
     - "Capturar" (Capture) button generates PNG via html2canvas and copies to clipboard
     - Legacy format migration for descuentos field (old object → new array format)
     - Read-only mode for past months

6. **App Shell** (lines 850-929)
   - Tab navigation (Gastos / Flujo de Caja)
   - Collapsible sidebar (desktop) / mobile menu drawer
   - Import/export orchestration

### Data Storage

- **Keys:**
  - `"expense-tracker-all-months"` — stores all expense data (ExpenseTracker.allMonths)
  - `"flujo-caja-data"` — stores all cash flow data (FlujoCaja.allMonths)
- **Format:** JSON-serialized nested objects by month key (e.g., `{ "2025-03": {...}, "2025-04": {...} }`)
- **Abstraction:** `window.storage.get(key)` / `window.storage.set(key, value)` in storage.js

### Styling

- **Framework:** Tailwind CSS with PostCSS
- **Color scheme:** Greens (paid/income), reds (unpaid/outflow), blues (actions), grays (neutral)
- **Responsive:** Mobile-first with breakpoint-specific sidebar behavior (hidden on mobile, collapsible on desktop)

## Key Design Patterns

1. **Month-as-Key Storage** — All data indexed by `toMonthKey()` output; enables multi-month history
2. **Read-Only Past Months** — Current month (derived from `new Date()`) is editable; others are read-only
3. **Auto-Save on Change** — useEffect watches state and persists immediately (no explicit save button)
4. **Drag-to-Reorder** — Expenses can be dragged within categories or between categories; drag state tracked in useRef
5. **Dual-Mode Fields** — AmountInput shows currency-formatted text until focus, then switches to number input

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

- **No explicit error handling for storage failures** — gracefully falls back to fresh month if loading fails
- **Date comparison for read-only mode** — uses `toMonthKey()` string comparison (works because format is YYYY-MM)
- **html2canvas dynamic loading** — Capture button lazy-loads the library from CDN on first click
- **Legacy data migration** — FlujoCaja automatically converts old descuentos format on load



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