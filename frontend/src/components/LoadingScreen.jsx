import { useEffect, useState } from "react";

const ACCENT  = "#7c3aed";
const ACCENTL = "#a78bfa";
const GOLD    = "#f59e0b";
const BG      = "#08080f";

/**
 * Full-screen branded loading state, shown while App.jsx's initial data
 * fetch (organizers/events/scan logs) is in flight.
 *
 * `ready` should be the real "we're done loading" signal (i.e. `!loading`
 * from App.jsx), not a guess. Previously this component ran on fixed
 * setTimeout delays with no connection to actual load time — always
 * forcing a fade-out at ~1.6s regardless of whether real data had
 * actually finished loading (risking a blank/broken screen underneath on
 * a slow connection) or making people sit through 2+ seconds of
 * animation on a fast one, for no reason. Now the entrance choreography
 * still plays out on a fixed timeline (that's just a reveal animation,
 * harmless either way), but the EXIT only happens once `ready` is
 * actually true, with a short grace period so the fade transition has
 * time to play instead of the app yanking this out of the DOM instantly.
 */
export default function LoadingScreen({ ready = false, onDone }) {
  const [phase, setPhase] = useState(0);       // 0 → logo scale in, 1 → text reveals, 2 → bar shows
  const [fadingOut, setFadingOut] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 250);
    const t2 = setTimeout(() => setPhase(2), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    setFadingOut(true);
    const t = setTimeout(() => { setMounted(false); onDone?.(); }, 400); // matches the opacity transition below
    return () => clearTimeout(t);
  }, [ready]);

  if (!mounted) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: BG,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: fadingOut ? 0 : 1,
      transition: "opacity .4s ease",
      pointerEvents: fadingOut ? "none" : "all",
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

      {/* Real logo, not a placeholder */}
      <img src="/logo-icon.png" alt="Evenova" style={{
        width: 72, height: 72, borderRadius: 22,
        marginBottom: 20,
        transform: phase >= 0 ? "scale(1)" : "scale(0.5)",
        opacity: phase >= 0 ? 1 : 0,
        transition: "transform .5s cubic-bezier(.34,1.56,.64,1), opacity .3s ease",
        boxShadow: `0 0 40px ${ACCENT}55, 0 0 80px ${ACCENT}22`,
        animation: phase >= 1 ? "logoPulse 2s ease-in-out infinite" : "none",
      }}/>

      <div style={{
        fontFamily: "'Outfit', system-ui, sans-serif",
        fontSize: 32, fontWeight: 900,
        background: `linear-gradient(135deg, white, ${ACCENTL} 55%, ${GOLD})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        marginBottom: 10,
        transform: phase >= 1 ? "translateY(0)" : "translateY(10px)",
        opacity: phase >= 1 ? 1 : 0,
        transition: "transform .45s cubic-bezier(.34,1.2,.64,1), opacity .35s ease",
      }}>
        Evenova
      </div>

      <p style={{
        fontSize: 13, color: "rgba(148,163,184,0.6)", letterSpacing: ".2em",
        textTransform: "uppercase", marginBottom: 40,
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? "translateY(0)" : "translateY(8px)",
        transition: "opacity .4s ease .1s, transform .4s ease .1s",
      }}>
        Event Platform
      </p>

      {/* Indeterminate progress bar — no fixed end time, since real
          loading time varies (network conditions, etc.); a bar that
          claims to reach 100% at a fixed moment would be lying. */}
      <div style={{
        width: 160, height: 3, borderRadius: 100,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
        opacity: phase >= 2 ? 1 : 0,
        transition: "opacity .2s ease",
      }}>
        <div style={{
          height: "100%", width: "40%", borderRadius: 100,
          background: `linear-gradient(90deg, ${ACCENT}, ${ACCENTL}, ${GOLD})`,
          animation: phase >= 2 ? "indeterminate 1.3s ease-in-out infinite" : "none",
        }}/>
      </div>

      <style>{`
        @keyframes orbPulse { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.15)} }
        @keyframes logoPulse { 0%,100%{box-shadow:0 0 40px ${ACCENT}55,0 0 80px ${ACCENT}22} 50%{box-shadow:0 0 60px ${ACCENT}88,0 0 120px ${ACCENT}33} }
        @keyframes indeterminate { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }
      `}</style>
    </div>
  );
}
