import { useEffect } from "react";

/* ─────────────────────────────────────────────────────────────
   GLOBAL STYLES — CSS variables drive light + dark mode
   Controlled via data-theme="dark" | "light" on <html>
───────────────────────────────────────────────────────────── */
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  * { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
  .outfit { font-family: 'Outfit', system-ui, sans-serif !important; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: var(--ev-border); border-radius: 2px; }
  input, select, textarea, button { font-family: inherit; outline: none; }

  /* ══ DARK MODE (default) ══════════════════════════════════ */
  :root, [data-theme="dark"] {
    --ev-bg:         #08080f;
    --ev-card:       #0f172a;
    --ev-surface:    #1e293b;
    --ev-border:     #334155;
    --ev-text:       #f1f5f9;
    --ev-muted:      #94a3b8;
    --ev-subtle:     #1e293b40;
    --ev-accent:     #7c3aed;
    --ev-accentL:    #a78bfa;
    --ev-gold:       #f59e0b;
    --ev-success:    #22c55e;
    --ev-danger:     #ef4444;
    --ev-info:       #38bdf8;
    --ev-warn:       #f97316;
    --ev-overlay:    rgba(0,0,0,0.85);
    --ev-glass:      rgba(255,255,255,0.04);
    --ev-glass-b:    rgba(255,255,255,0.09);
    --ev-nav-bg:     rgba(8,8,15,0.8);
    --ev-shadow:     0 8px 32px rgba(0,0,0,.4);
    --ev-shadow-sm:  0 2px 8px rgba(0,0,0,.3);
    --ev-hero-orb:   0.06;
  }

  /* ══ LIGHT MODE ══════════════════════════════════════════ */
  [data-theme="light"] {
    --ev-bg:         #f4f6fb;
    --ev-card:       #ffffff;
    --ev-surface:    #eef0f7;
    --ev-border:     #cdd4e8;
    --ev-text:       #0d1526;
    --ev-muted:      #52637a;
    --ev-subtle:     #cdd4e820;
    --ev-accent:     #6d28d9;
    --ev-accentL:    #7c3aed;
    --ev-gold:       #b45309;
    --ev-success:    #15803d;
    --ev-danger:     #b91c1c;
    --ev-info:       #0369a1;
    --ev-warn:       #c2410c;
    --ev-overlay:    rgba(0,0,0,0.55);
    --ev-glass:      rgba(255,255,255,0.82);
    --ev-glass-b:    rgba(0,0,0,0.1);
    --ev-nav-bg:     rgba(244,246,251,0.9);
    --ev-shadow:     0 8px 32px rgba(0,0,0,.10);
    --ev-shadow-sm:  0 2px 6px rgba(0,0,0,.07);
    --ev-hero-orb:   0.04;
  }

  body {
    background: var(--ev-bg);
    color: var(--ev-text);
    -webkit-font-smoothing: antialiased;
    transition: background 0.28s ease, color 0.28s ease;
  }

  /* ── Animations ── */
  @keyframes fadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
  @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
  @keyframes floatA   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
  @keyframes floatB   { 0%,100%{transform:translateY(-6px)} 50%{transform:translateY(10px)} }
  @keyframes ticker   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes pulse2   { 0%,100%{opacity:1} 50%{opacity:.45} }
  @keyframes orbMove  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1) translate(10px,-10px)} }
  @keyframes slideDown{ from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:none} }
  @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes glow     { 0%,100%{box-shadow:0 0 20px #7c3aed44} 50%{box-shadow:0 0 40px #7c3aed88} }
  @keyframes popIn    { 0%{opacity:0;transform:scale(.88)} 70%{transform:scale(1.04)} 100%{opacity:1;transform:scale(1)} }
  @keyframes scanLine { 0%,100%{top:10%} 50%{top:82%} }
  @keyframes countUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }

  .fade-up    { animation: fadeUp .45s ease both; }
  .fade-in    { animation: fadeIn .3s ease; }
  .float-a    { animation: floatA 7s ease-in-out infinite; }
  .float-b    { animation: floatB 9s ease-in-out infinite; }
  .ticker-wrap{ animation: ticker 32s linear infinite; }
  .live-dot   { animation: pulse2 1.5s ease-in-out infinite; }
  .orb        { animation: orbMove 14s ease-in-out infinite; }
  .spin       { animation: spin .75s linear infinite; }
  .slide-down { animation: slideDown .22s ease; }
  .pop-in     { animation: popIn .4s cubic-bezier(.34,1.56,.64,1) both; }
  .count-up   { animation: countUp .5s ease both; }
  .stagger-1  { animation-delay: .1s !important; }
  .stagger-2  { animation-delay: .2s !important; }
  .stagger-3  { animation-delay: .3s !important; }

  /* ── Glassmorphism ── */
  .glass {
    background: var(--ev-glass);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid var(--ev-glass-b);
  }
  .glass-card {
    background: var(--ev-glass);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid var(--ev-glass-b);
    border-radius: 20px;
    box-shadow: var(--ev-shadow);
  }
  [data-theme="light"] .glass-card {
    background: rgba(255,255,255,0.9);
    border: 1px solid var(--ev-border);
    box-shadow: 0 4px 20px rgba(0,0,0,.08);
  }
  .glass-nav {
    background: var(--ev-nav-bg);
    backdrop-filter: blur(32px) saturate(200%);
    -webkit-backdrop-filter: blur(32px) saturate(200%);
    border-bottom: 1px solid var(--ev-glass-b);
  }
  .glass-strong {
    background: var(--ev-glass);
    backdrop-filter: blur(40px) saturate(200%);
    -webkit-backdrop-filter: blur(40px) saturate(200%);
    border: 1px solid var(--ev-glass-b);
    border-radius: 24px;
    box-shadow: var(--ev-shadow);
  }
  .hover-lift { transition: transform .22s ease, box-shadow .22s ease; }
  .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 20px 48px rgba(0,0,0,.3); }
  .grad-text {
    background: linear-gradient(135deg,#7c3aed,#a78bfa,#f59e0b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ── Grids ── */
  .g2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .g3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .g4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
  .ga { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:20px; }

  @media(max-width:1024px){
    .g4 { grid-template-columns:repeat(2,1fr) !important; }
    .hero-cards { display:none !important; }
  }
  @media(max-width:640px){
    .g2,.g3,.g4 { grid-template-columns:1fr !important; }
    .ga { grid-template-columns:1fr !important; }
    .hide-mobile { display:none !important; }
    .show-mobile { display:flex !important; }
    .mobile-col  { flex-direction:column !important; align-items:flex-start !important; }
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
   DESIGN TOKENS (CSS var wrappers — theme-aware)
───────────────────────────────────────────────────────────── */
export const T = {
  accent:  "var(--ev-accent)",
  accentL: "var(--ev-accentL)",
  gold:    "var(--ev-gold)",
  text:    "var(--ev-text)",
  muted:   "var(--ev-muted)",
  border:  "var(--ev-border)",
  surface: "var(--ev-surface)",
  card:    "var(--ev-card)",
  bg:      "var(--ev-bg)",
  danger:  "var(--ev-danger)",
  success: "var(--ev-success)",
  info:    "var(--ev-info)",
  warn:    "var(--ev-warn)",
  subtle:  "var(--ev-subtle)",
  overlay: "var(--ev-overlay)",
  shadow:  "var(--ev-shadow)",
};

export const GA = "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)";
export const GG = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";

export const EVENT_BANNERS = {
  music:    "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
  tech:     "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  technology: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  food:     "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
  arts:     "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)",
  sports:   "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
  business: "linear-gradient(135deg, #0ea5e9 0%, #6d28d9 100%)",
  fashion:  "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
  default:  "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
  // legacy numeric keys
  0: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
  1: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  2: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  3: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
  4: "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)",
};

/* ─────────────────────────────────────────────────────────────
   SERVICE CHARGE UTILS
   Platform collects 5% on every paid ticket.
   Organizer balance = ticket price (95%).
───────────────────────────────────────────────────────────── */
export const SERVICE_CHARGE_PCT = 5;

/** Returns the platform fee amount in NGN */
export function calcServiceCharge(ticketPrice) {
  if (!ticketPrice || ticketPrice <= 0) return 0;
  return Math.ceil(ticketPrice * SERVICE_CHARGE_PCT / 100);
}

/** Returns the total the attendee pays */
export function calcTotalWithCharge(ticketPrice) {
  if (!ticketPrice || ticketPrice <= 0) return 0;
  return ticketPrice + calcServiceCharge(ticketPrice);
}

/** Returns the amount the organizer earns (after platform fee) */
export function calcOrganizerEarning(ticketPrice) {
  return ticketPrice - 0; // organizer gets full ticket price; platform takes fee from attendee on top
}