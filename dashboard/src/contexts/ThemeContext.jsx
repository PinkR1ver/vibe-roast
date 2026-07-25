import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("vibe-theme");
      return ["light", "dark", "system"].includes(saved) ? saved : "system";
    }
    catch { return "system"; }
  });
  const [systemDark, setSystemDark] = useState(() =>
    typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark" || (theme === "system" && systemDark);
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    try { localStorage.setItem("vibe-theme", theme); } catch {}
  }, [theme, systemDark]);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const cycle = () => setTheme((t) => (t === "light" ? "dark" : t === "dark" ? "system" : "light"));

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      cycle,
      resolvedTheme: theme === "system" ? (systemDark ? "dark" : "light") : theme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
