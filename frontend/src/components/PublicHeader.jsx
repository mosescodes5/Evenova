import { useState } from "react";
import { Calendar, Home, Info, Menu, MessageSquare, Sparkles, Zap } from "lucide-react";
import { GA, T } from "../styles/theme.js";
import { Btn } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";
import { ThemeToggle } from "./ThemeToggle.jsx";

export default function PublicHeader({ view, onNav }) {
  const { mobile } = useMedia();
  const [open, setOpen] = useState(false);
  const links = [
    ["landing",       "Home",         Home],
    ["explore",       "Events",       Calendar],
    ["how-it-works",  "How It Works", Zap],
    ["about",         "About",        Info],
    ["contact",       "Contact",      MessageSquare],
  ];

  return (
    <header className="glass-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", height: 64, gap: 12 }}>
        {/* Logo */}
        <button onClick={() => onNav("landing")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", marginRight: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: GA, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} color="white" />
          </div>
          <span className="outfit" style={{ fontWeight: 800, fontSize: 22, color: T.text }}>Evenova</span>
        </button>

        {/* Desktop nav links */}
        {!mobile && (
          <nav style={{ display: "flex", gap: 2, flex: 1 }}>
            {links.map(([v, l, Icon]) => (
              <button key={v} onClick={() => onNav(v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 10,
                  background: view === v ? "var(--ev-accent)20" : "none",
                  border: "none",
                  color: view === v ? "var(--ev-accentL)" : "var(--ev-muted)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                }}
                onMouseEnter={e => { if (view !== v) { e.currentTarget.style.color = "var(--ev-text)"; e.currentTarget.style.background = "var(--ev-glass)"; } }}
                onMouseLeave={e => { if (view !== v) { e.currentTarget.style.color = "var(--ev-muted)"; e.currentTarget.style.background = "none"; } }}>
                <Icon size={14} />{l}
              </button>
            ))}
          </nav>
        )}

        <div style={{ marginLeft: mobile ? "auto" : 0, display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle />
          {!mobile && (
            <>
              <Btn v="ghost" onClick={() => onNav("login")} sz="sm">Log In</Btn>
              <Btn onClick={() => onNav("register")} sz="sm">Get Started</Btn>
            </>
          )}
          {mobile && (
            <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 6 }}>
              <Menu size={22} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobile && open && (
        <div className="slide-down" style={{ background: "var(--ev-surface)", borderTop: "1px solid var(--ev-border)", padding: 12 }}>
          {links.map(([v, l, Icon]) => (
            <button key={v} onClick={() => { onNav(v); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "12px 14px", background: "none", border: "none",
                borderBottom: "1px solid var(--ev-border)",
                color: T.text, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>
              <Icon size={16} style={{ color: "var(--ev-muted)" }} />{l}
            </button>
          ))}
          <div style={{ display: "flex", gap: 8, padding: "12px 0 4px" }}>
            <Btn full v="secondary" onClick={() => { onNav("login"); setOpen(false); }}>Log In</Btn>
            <Btn full onClick={() => { onNav("register"); setOpen(false); }}>Get Started</Btn>
          </div>
        </div>
      )}
    </header>
  );
}