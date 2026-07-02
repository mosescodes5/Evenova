import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, BarChart3, Calculator, Layout, Mail, QrCode,
  Ticket, TrendingUp, UserCheck, Users, Music, PartyPopper,
  Briefcase, GraduationCap,
} from "lucide-react";
import { Reveal, StaggerReveal, StaggerItem, PageMotion, HoverCard } from "../components/Motion.jsx";
import { T, SERVICE_CHARGE_PCT, calcServiceCharge, calcTotalWithCharge, calcOrganizerEarning } from "../styles/theme.js";
import { Btn, Inp } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";

const FEATURES = [
  [Ticket, "Flexible Ticket Tiers", "Create multiple ticket types with their own pricing, perks, and artwork — free events cost nothing at all."],
  [QrCode, "Tamper-Proof QR Tickets", "Every ticket is cryptographically signed. No fakes, no duplicates, no screenshots getting past the gate."],
  [TrendingUp, "Live Sales Tracking", "Watch tickets sell in real time with a revenue dashboard that updates the moment a payment lands."],
  [UserCheck, "Gate & Staff Management", "Assign scanners to specific gates, track who checked in whom, and keep every entry point accountable."],
  [Mail, "Email & WhatsApp Blasts", "Reach every attendee — or just a segment of them — with updates, reminders, or last-minute changes."],
  [Layout, "Custom Event Pages", "A branded page for every event, with your own cover image, ticket art, and registration questions."],
  [BarChart3, "Full Scan Session Logs", "See exactly who scanned who in, when, and at which gate — audit-ready, automatically."],
  [Users, "Team Access", "Bring your event team on board with roles for organizers, coordinators, and gate staff."],
];

const USE_CASES = [
  [Music, "Concerts & Festivals", "Handle high-volume gate entry without the bottleneck."],
  [PartyPopper, "Celebrations & Socials", "Weddings, launches, and parties that feel effortless to run."],
  [Briefcase, "Conferences & Summits", "Badge-ready check-in for professional, multi-day events."],
  [GraduationCap, "Classes & Workshops", "Simple registration for recurring or capped-capacity sessions."],
];

function FeeCalculator({ mobile }) {
  const [price, setPrice] = useState("10000");
  const [feeMode, setFeeMode] = useState("pass_through");
  const priceNum = Number(price) || 0;
  const fee = useMemo(() => calcServiceCharge(priceNum), [priceNum]);
  const total = useMemo(() => calcTotalWithCharge(priceNum, feeMode), [priceNum, feeMode]);
  const earning = useMemo(() => calcOrganizerEarning(priceNum, feeMode), [priceNum, feeMode]);

  return (
    <div style={{
      position: "relative", borderRadius: 24, overflow: "hidden",
      background: "linear-gradient(135deg, rgba(124,58,237,.12), rgba(168,85,247,.05))",
      border: `1px solid ${T.border}`, maxWidth: 480, margin: "0 auto",
    }}>
      <div style={{ padding: mobile ? 24 : 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Calculator size={16} style={{ color: T.accentL }} />
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: T.accentL }}>
            Calculate your fees
          </p>
        </div>
        <Inp label="Ticket price (₦)" type="number" value={price} onChange={setPrice} placeholder="10000" />

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {[["pass_through", "Attendee pays fee"], ["absorb", "I absorb the fee"]].map(([mode, label]) => (
            <button key={mode} onClick={() => setFeeMode(mode)}
              style={{ flex: 1, padding: "9px 10px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${feeMode === mode ? T.accent : T.border}`,
                background: feeMode === mode ? T.accent + "20" : "transparent",
                color: feeMode === mode ? T.accentL : T.muted }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", height: 0, margin: "22px 0" }}>
          <div style={{ position: "absolute", top: -11, left: -32, width: 22, height: 22, borderRadius: "50%", background: T.bg }} />
          <div style={{ position: "absolute", top: -11, right: -32, width: 22, height: 22, borderRadius: "50%", background: T.bg }} />
        </div>
        <div style={{ borderTop: `2px dashed ${T.border}`, marginBottom: 20 }} />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, background: T.card, borderRadius: 14, padding: "16px 18px", border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Attendee pays</p>
            <p className="outfit" style={{ fontSize: 22, fontWeight: 800, color: T.text }}>₦{total.toLocaleString()}</p>
          </div>
          <div style={{ flex: 1, background: T.accent + "15", borderRadius: 14, padding: "16px 18px", border: `1px solid ${T.accent}40` }}>
            <p style={{ fontSize: 11, color: T.accentL, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>You receive</p>
            <p className="outfit" style={{ fontSize: 22, fontWeight: 800, color: T.accentL }}>₦{earning.toLocaleString()}</p>
          </div>
        </div>
        <p style={{ fontSize: 12, color: T.muted, marginTop: 14, textAlign: "center" }}>
          {feeMode === "absorb"
            ? <>You're absorbing the {SERVICE_CHARGE_PCT}% fee (₦{fee.toLocaleString()}) — attendees pay exactly the ticket price.</>
            : <>A {SERVICE_CHARGE_PCT}% service fee (₦{fee.toLocaleString()}) is added on top for the attendee — you keep 100% of your ticket price.</>}
        </p>
      </div>
    </div>
  );
}

export default function Pricing({ onNav }) {
  const { mobile } = useMedia();

  return (
    <PageMotion><div style={{ background: T.bg, paddingTop: 64 }}>

      {/* ── Hero ────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${T.accent}20, transparent)`,
        borderBottom: `1px solid ${T.border}`,
        padding: mobile ? "56px 20px 48px" : "88px 24px 64px",
        textAlign: "center",
      }}>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}
          className="outfit" style={{ fontSize: mobile ? 34 : 52, fontWeight: 900, color: T.text, marginBottom: 16, lineHeight: 1.1 }}>
          Free events are<br />always free on Evenova
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .1 }}
          style={{ fontSize: 18, color: T.muted, maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.7 }}>
          No monthly fees, no setup costs, no card required. We only make money when your paid tickets sell — and even then, you keep every naira of the ticket price.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .2 }}>
          <Btn sz="lg" onClick={() => onNav("register")}>Launch an event for free <ArrowRight size={16} /></Btn>
        </motion.div>
      </div>

      {/* ── Fee model + calculator ─────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "56px 16px" : "80px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 40, alignItems: "center" }}>
          <Reveal>
            <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: T.accentL, marginBottom: 12 }}>
              Simple, one-line pricing
            </p>
            <h2 className="outfit" style={{ fontSize: mobile ? 26 : 34, fontWeight: 800, color: T.text, marginBottom: 18, lineHeight: 1.25 }}>
              For paid events, we charge {SERVICE_CHARGE_PCT}% of the ticket price
            </h2>
            <p style={{ fontSize: 15, color: T.muted, lineHeight: 1.8, marginBottom: 12 }}>
              You choose who pays it. Pass it on to attendees at checkout and keep 100% of your ticket price — or absorb it yourself and let attendees pay exactly the price you set. Switch it per event, any time.
            </p>
            <p style={{ fontSize: 15, color: T.muted, lineHeight: 1.8 }}>
              Free events never pay a fee, at any point, for any number of attendees.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <FeeCalculator mobile={mobile} />
          </Reveal>
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${T.border}`, background: T.card + "40" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "56px 16px" : "80px 24px" }}>
          <Reveal>
            <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: T.accentL, textAlign: "center", marginBottom: 12 }}>
              Included, always
            </p>
            <h2 className="outfit" style={{ fontSize: mobile ? 26 : 34, fontWeight: 800, color: T.text, textAlign: "center", marginBottom: 48, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
              Everything you need to run an event, without touching your wallet
            </h2>
          </Reveal>
          <StaggerReveal stagger={0.08} className="g4" style={mobile ? { display: "grid", gap: 16 } : { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {FEATURES.map(([Icon, t, d], i) => (
              <StaggerItem key={i}>
                <HoverCard style={{ padding: 24, borderRadius: 16, background: T.card, border: `1px solid ${T.border}`, height: "100%" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accent + "18", border: `1px solid ${T.accent}35`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Icon size={20} style={{ color: T.accentL }} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>{t}</h3>
                  <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.65 }}>{d}</p>
                </HoverCard>
              </StaggerItem>
            ))}
          </StaggerReveal>
        </div>
      </div>

      {/* ── Use cases ───────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "56px 16px" : "80px 24px" }}>
        <Reveal>
          <h2 className="outfit" style={{ fontSize: mobile ? 26 : 34, fontWeight: 800, color: T.text, textAlign: "center", marginBottom: 48 }}>
            Built for every kind of gathering
          </h2>
        </Reveal>
        <StaggerReveal stagger={0.08} style={mobile ? { display: "grid", gap: 16 } : { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {USE_CASES.map(([Icon, t, d], i) => (
            <StaggerItem key={i}>
              <div style={{ textAlign: "center", padding: "8px 12px" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${T.accent}, ${T.accentL})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Icon size={24} color="white" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>{t}</h3>
                <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{d}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: mobile ? "56px 20px" : "80px 24px", textAlign: "center" }}>
        <Reveal>
          <h2 className="outfit" style={{ fontSize: mobile ? 26 : 34, fontWeight: 800, color: T.text, marginBottom: 16 }}>
            Ready to run your first event?
          </h2>
          <p style={{ fontSize: 15, color: T.muted, marginBottom: 28 }}>It takes less than five minutes to get started.</p>
          <Btn sz="lg" onClick={() => onNav("register")}>Get started for free <ArrowRight size={16} /></Btn>
        </Reveal>
      </div>

    </div></PageMotion>
  );
}