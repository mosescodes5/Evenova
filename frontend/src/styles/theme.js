import { useEffect } from "react";

/* ─────────────────────────────────────────────────────────────
   1. GLOBAL STYLES
───────────────────────────────────────────────────────────── */
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #08080f; color: #f1f5f9; -webkit-font-smoothing: antialiased; }
  * { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
  .outfit { font-family: 'Outfit', system-ui, sans-serif !important; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 2px; }
  input, select, textarea, button { font-family: inherit; outline: none; }

  /* ── Animations ── */
  @keyframes fadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
  @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
  @keyframes floatA   { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-14px)} }
  @keyframes floatB   { 0%,100%{transform:translateY(-6px)} 50%{transform:translateY(10px)} }
  @keyframes ticker   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes pulse2   { 0%,100%{opacity:1} 50%{opacity:.45} }
  @keyframes orbMove  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1) translate(10px,-10px)} }
  @keyframes slideDown{ from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:none} }

  .fade-up    { animation: fadeUp .45s ease both; }
  .fade-in    { animation: fadeIn .3s ease; }
  .float-a   { animation: floatA 7s ease-in-out infinite; }
  .float-b   { animation: floatB 9s ease-in-out infinite; }
  .ticker-wrap{ animation: ticker 32s linear infinite; }
  .live-dot  { animation: pulse2 1.5s ease-in-out infinite; }
  .orb       { animation: orbMove 14s ease-in-out infinite; }
  .spin      { animation: spin .75s linear infinite; }
  .slide-down{ animation: slideDown .22s ease; }

  /* ── Responsive grid helpers ── */
  .g2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .g3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .g4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
  .ga { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:20px; }

  @media(max-width:1024px){
    .g4 { grid-template-columns:repeat(2,1fr) !important; }
    .hero-cards { display:none !important; }
    .detail-side { display:none !important; }
  }
  @media(max-width:640px){
    .g2,.g3,.g4 { grid-template-columns:1fr !important; }
    .ga { grid-template-columns:1fr !important; }
    .hide-mobile { display:none !important; }
    .show-mobile { display:flex !important; }
    .mobile-col  { flex-direction:column !important; align-items:flex-start !important; }
    .mobile-p    { padding:16px !important; }
  }
`;

export function StyleInjector() {
  useEffect(() => {
    if (document.getElementById("ev-global")) return;
    const el = document.createElement("style");
    el.id = "ev-global";
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
  }, []);
  return null;
}

/* ─────────────────────────────────────────────────────────────
   2. DESIGN TOKENS
───────────────────────────────────────────────────────────── */
export const T = {
  accent:  "#7c3aed",   // primary purple
  accentL: "#a78bfa",   // light purple (badge text)
  gold:    "#f59e0b",   // gold / amber
  text:    "#f1f5f9",   // primary text
  muted:   "#94a3b8",   // secondary / muted text
  border:  "#334155",   // border color
  surface: "#1e293b",   // input / surface background
  card:    "#0f172a",   // card background
  danger:  "#ef4444",   // red / error
  success: "#22c55e",   // green / success
  info:    "#38bdf8",   // blue / info
  warn:    "#f97316",   // orange / warning
};

// Primary button gradient (purple)
export const GA = "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)";

// Gold button gradient
export const GG = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
// Event banner gradients
export const EVENT_BANNERS = [
  "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)",
  "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
  "linear-gradient(135deg, #6d28d9 0%, #db2777 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #6d28d9 100%)",
];