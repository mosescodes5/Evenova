import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";

export function ThemeToggle({ style = {} }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 36, height: 36, borderRadius: 10,
        background: "var(--ev-surface)",
        border: "1px solid var(--ev-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "var(--ev-muted)",
        transition: "all .18s",
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = "var(--ev-text)"; e.currentTarget.style.borderColor = "var(--ev-accent)"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "var(--ev-muted)"; e.currentTarget.style.borderColor = "var(--ev-border)"; }}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}