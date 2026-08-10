import { render } from "@testing-library/react";
import { I18nProvider } from "../i18n/index.jsx";
import { ToastProvider } from "../components/Toast.jsx";

// Every feature component calls useI18n() and useToast(), and useToast throws
// outside its provider, so a bare render() of a feature always fails.
//
// The language is pinned to English here rather than left to each caller: `es`
// is both the default and the fallback, so without this every English text query
// misses. Pass `{ lang: "es" }` to opt out. Clear localStorage in afterEach.
export function renderWithProviders(ui, { lang = "en", ...options } = {}) {
  localStorage.setItem("app-language", lang);
  return render(
    <I18nProvider>
      <ToastProvider>{ui}</ToastProvider>
    </I18nProvider>,
    options
  );
}
