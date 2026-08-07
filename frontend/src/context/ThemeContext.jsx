/**
 * ThemeContext.jsx — light / dark mode for Evenova
 * Wrap <App> with <ThemeProvider> in main.jsx
 */
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem("ev-theme");
      if (stored) return stored === "dark";
    } catch {}
    return true; // default dark
  });

  useEffect(() => {
    try { localStorage.setItem("ev-theme", isDark ? "dark" : "light"); } catch {}
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Set initial attribute on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  const toggle = () => setIsDark(d => !d);

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { isDark: true, toggle: () => {} };
  return ctx;
}