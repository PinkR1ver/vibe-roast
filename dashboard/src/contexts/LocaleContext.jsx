import React, { createContext, useContext, useMemo, useState } from "react";
import { normalizeLocale, t as translate } from "../lib/i18n.js";

const LocaleContext = createContext({
  locale: "en",
  setLocale: () => {},
  toggleLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      return normalizeLocale(localStorage.getItem("vibe-locale") || "en");
    } catch {
      return "en";
    }
  });

  const setLocale = (next) => {
    const normalized = normalizeLocale(next);
    setLocaleState(normalized);
    try { localStorage.setItem("vibe-locale", normalized); } catch {}
  };

  const value = useMemo(() => ({
    locale,
    setLocale,
    toggleLocale: () => setLocale(locale === "en" ? "zh" : "en"),
    t: (key, values) => translate(key, locale, values),
  }), [locale]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
