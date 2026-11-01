# AGENTS.md

React + Vite frontend for the money app. Data lives in the backend
(`../money_be`), reached only through `src/api.js`. Scripts are in
`package.json`; `npm test` runs the suite once, `npm run lint` is the gate.
Run `npm run hooks` once per clone to enable the lint pre-commit hook.

Env vars are in `.env.example`. `VITE_API_URL` falls back to
`http://localhost:8000`. To run the whole stack locally, follow
`../docs/run-local.md`.

## Testing

Vitest with jsdom, config in the `test` block of `vite.config.js`. Specs are
`src/**/*.test.{js,jsx}`, colocated next to what they cover. Helpers live in
`src/test/` and must not be named `*.test.js`, or the include glob runs them.

Three things bite when testing a feature component:

- **Two providers are mandatory.** `useToast()` throws outside `ToastProvider`,
  and features also call `useI18n()`. Use `renderWithProviders`, which pins the
  language to `en` since `es` is both the default and the fallback.
- **`supabaseClient.js` must be module-mocked** or importing `api.js` reads
  missing env vars. `vi.mock("../../supabaseClient.js", () => supabaseMock())`.
- **Route the fetch mock by URL.** Features fire several requests on mount, so
  one blanket `mockResolvedValue` makes tests pass for the wrong reason. Use
  `installFetchMock({ "POST /debts": {...} })`; unmatched requests throw.

Every feature gets three tests: happy path, edge case, failure.

Assert the request a component sends, not just what renders. Query by role and
text; never assert on Tailwind class strings.

jsdom 30 requires Node `^22.22.2 || ^24.15.0 || >=26`. On an older Node, npm
warns `EBADENGINE`.

## App shell and auth

`main.jsx` nests `AuthProvider` > `I18nProvider` > `ToastProvider` >
`ErrorBoundary` > `App`. Without a session, `App.jsx` shows the landing page,
then login. A password-recovery link shows `ResetPassword`. With a session it
renders the tab named in `tab` state, one feature component from
`src/features/` per tab. Language and theme controls sit in the `App.jsx` top
bar. Profile, with display name and password, opens from the user menu.

## API client

- `authFetch` in `api.js` attaches the Supabase access token as a Bearer header.
  A 401 signs the user out, which drops the app back to the login screen.
- Every non-ok response throws an `ApiError` (`src/lib/apiError.js`) carrying
  the backend's error `code`. Callers never check `res.ok`.
- Show users `t(errorKey(err))`, never the server `message`. The message is
  English server prose.
- `mapExpense` and `mapIncome` rename backend `expense`/`income` and `value` to
  `name` and `amount`.
- List endpoints wrap the rows in an object, e.g. `{ expenses: [...] }`. The
  fetchers unwrap them.
- `src/lib/reportError.js` is the single error-reporting call site.

## Expenses and income

Both are thin configs over `src/components/CategorizedPage.jsx`, which holds
the shared page: month navigation, modals and writes.

- Data is keyed by month, `toMonthKey()` (`YYYY-MM`). Status and amount are
  stored per month.
- Months before the current one are read-only and load soft-deleted categories
  too. The current and future months are editable. The check is a plain string
  compare on month keys.
- Writes go through `useResource` (`src/lib/useResource.js`). Both writers
  apply the change at once. On a failed save, `patch` restores the touched
  fields. `mutate` rolls back only when given an `undo`. Without one, the
  optimistic change stays, as with delete, create and reorder.

## Styling

Tailwind, with `darkMode: "class"`. Use the semantic tokens in
`src/lib/tokens.js` instead of hardcoding colors or type sizes. Color encodes
state, not which page you are on.

The PNG export in Splitter and DebtKiller loads `html2canvas` from cdnjs at
click time. It is not an npm dependency.

## i18n and theme

- `useI18n()` gives `lang`, `t`, `locale`, `currency` and `theme`.
- `t(key)` falls back to Spanish, then to the key itself.
- `es` is the default, with COP. `en` uses USD.
- Add every new string to both `es.json` and `en.json`.
- Language and theme persist to `localStorage["app-language"]` and
  `localStorage["app-theme"]`. Financial data never touches localStorage.
