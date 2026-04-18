import { createContext, useContext, useState, useCallback, useEffect } from "react";
import es from "./es.json";
import en from "./en.json";

const STORAGE_LANG = "app-language";
const STORAGE_THEME = "app-theme";
const catalogs = { es, en };
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_LANG) || "es");
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_THEME) || "light");

  const setLang = useCallback((l) => {
    localStorage.setItem(STORAGE_LANG, l);
    setLangState(l);
  }, []);

  const setTheme = useCallback((th) => {
    localStorage.setItem(STORAGE_THEME, th);
    setThemeState(th);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const t = useCallback(
    (key) => catalogs[lang]?.[key] ?? catalogs["es"][key] ?? key,
    [lang]
  );

  const locale = lang === "en" ? "en-US" : "es-CO";
  const currency = lang === "en" ? "USD" : "COP";

  return (
    <I18nContext.Provider value={{ lang, setLang, t, locale, currency, theme, setTheme }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
