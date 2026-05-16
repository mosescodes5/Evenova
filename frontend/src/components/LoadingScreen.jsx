import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const ACCENT  = "#7c3aed";
const ACCENTL = "#a78bfa";
const GOLD    = "#f59e0b";
const BG      = "#08080f";

export default function LoadingScreen() {
  const [phase, setPhase] = useState(0);
  // phase 0 → logo scale in, phase 1 → text reveals, phase 2 → bar fills, phase 3 → fade out
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 700);
    const t3 = setTimeout(() => setPhase(3), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const letters = "Evenova".split("");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: BG,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 0,
      opacity: phase === 3 ? 0 : 1,
      transition: "opacity .5s ease",
      pointerEvents: phase === 3 ? "none" : "all",
    }}>
      {/* Background glow orbs */}
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: 400, height: 400, borderRadius: "50%",
        background: ACCENT, opacity: 0.06, filter: "blur(80px)",
        animation: "orbPulse 3s ease-in-out infinite",
      }}/>
      <div style={{
        position: "absolute", top: "60%", left: "60%", transform: "translate(-50%,-50%)",
        width: 250, height: 250, borderRadius: "50%",
        background: GOLD, opacity: 0.04, filter: "blur(60px)",
        animation: "orbPulse 4s ease-in-out infinite reverse",
      }}/>

      {/* Logo icon */}
      <div style={{
        width: 72, height: 72, borderRadius: 22,
        background: `linear-gradient(135deg, ${ACCENT}, #6d28d9)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
        transform: phase >= 0 ? "scale(1)" : "scale(0.5)",
        opacity: phase >= 0 ? 1 : 0,
        transition: "transform .5s cubic-bezier(.34,1.56,.64,1), opacity .3s ease",
        boxShadow: `0 0 40px ${ACCENT}55, 0 0 80px ${ACCENT}22`,
        animation: phase >= 1 ? "logoPulse 2s ease-in-out infinite" : "none",
      }}>
        <Sparkles size={32} color="white"/>
      </div>

      {/* Letter-by-letter "Evenova" */}
      <div style={{ display: "flex", gap: 1, marginBottom: 10, height: 44, overflow: "hidden" }}>
        {letters.map((l, i) => (
          <span key={i} style={{
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontSize: 36, fontWeight: 900,
            background: i < 2
              ? `linear-gradient(135deg, white, ${ACCENTL})`
              : `linear-gradient(135deg, ${ACCENTL}, ${GOLD})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            display: "inline-block",
            transform: phase >= 1 ? "translateY(0)" : "translateY(100%)",
            opacity: phase >= 1 ? 1 : 0,
            transition: `transform .45s cubic-bezier(.34,1.2,.64,1) ${i * 55}ms,
                         opacity .3s ease ${i * 55}ms`,
          }}>
            {l}
          </span>
        ))}
      </div>

      <p style={{
        fontSize: 13, color: "rgba(148,163,184,0.6)", letterSpacing: ".2em",
        textTransform: "uppercase", marginBottom: 40,
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? "translateY(0)" : "translateY(8px)",
        transition: "opacity .4s ease .35s, transform .4s ease .35s",
      }}>
        Event Platform
      </p>

      {/* Progress bar */}
      <div style={{
        width: 200, height: 2, borderRadius: 100,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
        opacity: phase >= 2 ? 1 : 0,
        transition: "opacity .2s ease",
      }}>
        <div style={{
          height: "100%", borderRadius: 100,
          background: `linear-gradient(90deg, ${ACCENT}, ${ACCENTL}, ${GOLD})`,
          width: phase >= 2 ? "100%" : "0%",
          transition: "width .9s cubic-bezier(.4,0,.2,1)",
        }}/>
      </div>

      <style>{`
        @keyframes orbPulse { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.15)} }
        @keyframes logoPulse { 0%,100%{box-shadow:0 0 40px ${ACCENT}55,0 0 80px ${ACCENT}22} 50%{box-shadow:0 0 60px ${ACCENT}88,0 0 120px ${ACCENT}33} }
      `}</style>
    </div>
  );
}
