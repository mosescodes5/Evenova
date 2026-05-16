import { motion } from "framer-motion";
import { ArrowRight, Camera, CheckCircle, CreditCard, LayoutDashboard, Link2, Mail, QrCode, Scan, Settings, Ticket, Users, Zap } from "lucide-react";
import { GA, GG, T } from "../styles/theme.js";
import { Btn } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";
import { Reveal, StaggerReveal, StaggerItem, PageMotion, fadeUp, fadeLeft, fadeRight, scaleIn } from "../components/Motion.jsx";

/* ── Animated step card ────────────────────────────────── */
function Step({ num, icon: Icon, color, title, desc }) {
  return (
    <motion.div variants={fadeUp} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, position: "relative" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: color+"20", border: `1.5px solid ${color+"50"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={22} color={color}/>
        </div>
        <div style={{
          position: "absolute", top: -8, right: -8,
          width: 22, height: 22, borderRadius: 8,
          background: color, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 900, color: "white",
          boxShadow: `0 4px 12px ${color}55`,
        }}>{num}</div>
      </div>
      <div style={{ flex: 1, paddingTop: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 }}>{title}</h3>
        <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.75 }}>{desc}</p>
      </div>
    </motion.div>
  );
}

export default function HowItWorks({ onNav }) {
  const { mobile } = useMedia();

  const ORGANIZER_STEPS = [
    { icon: Settings,       color: T.accent,  title: "Create your account",          desc: "Register as an organizer in under 2 minutes. Verified by the Evenova admin team — your profile goes live after approval." },
    { icon: LayoutDashboard,color: T.info,    title: "Build your event",             desc: "Set up title, description, venue, time, gates, and multiple ticket tiers. You control pricing and quantities." },
    { icon: Ticket,         color: T.gold,    title: "Design ticket tiers & form",   desc: "Add custom checkout fields — dietary requirements, t-shirt size, referral codes — and upload custom ticket artwork per tier." },
    { icon: Link2,          color: T.success, title: "Share your event page",        desc: "Every event gets a public page with a clean ticket purchase flow and secure Paystack checkout. Share the link anywhere." },
    { icon: QrCode,         color: T.accentL, title: "Tickets go out automatically", desc: "Once an attendee pays, they get a signed QR code ticket by email instantly. Each ticket is cryptographically unique and unforgeable." },
    { icon: Camera,         color: "#06b6d4", title: "Scan on the day",              desc: "Use the Evenova Scanner on any phone — camera mode detects QR codes instantly, no special hardware needed. Works offline too." },
    { icon: LayoutDashboard,color: T.warn,    title: "Track it all live",            desc: "Watch check-ins in real time on the Live Dashboard. Revenue, gate traffic, and ticket breakdowns as your event unfolds." },
  ];

  const ATTENDEE_STEPS = [
    { icon: Ticket,     color: T.accent,  title: "Find an event",           desc: "Browse events on the Evenova public page. Filter by city, category, or date. Click to see full details, tiers, and pricing." },
    { icon: Users,      color: T.gold,    title: "Fill in your details",    desc: "The checkout form collects exactly what the organizer needs — custom fields let them ask for only what's relevant." },
    { icon: CreditCard, color: T.success, title: "Pay securely",            desc: "Checkout is powered by Paystack — Nigeria's most trusted gateway. Cards, bank transfer, and USSD all supported." },
    { icon: Mail,       color: T.info,    title: "Receive your QR ticket",  desc: "Your signed QR ticket arrives by email instantly. Save it to your phone — no printing needed. Each ticket is unique and tamper-proof." },
    { icon: Scan,       color: T.accentL, title: "Scan in at the gate",     desc: "Show your QR code at the gate. Admission in under a second. Wrong gate? Wrong event? The scanner catches it automatically." },
  ];

  return (
    <PageMotion>
      <div style={{ background: "#08080f", minHeight: "100vh", paddingTop: 80 }}>

        {/* ── Hero ── */}
        <div style={{ position: "relative", overflow: "hidden", padding: mobile ? "60px 20px 40px" : "80px 24px 56px", textAlign: "center" }}>
          {/* Orbs */}
          {[[T.accent,"20%","25%",500],[T.gold,"75%","55%",380]].map(([col,x,y,sz],i)=>(
            <motion.div key={i} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 0.06, scale: 1 }}
              transition={{ duration: 1.2, delay: i * 0.3, ease: "easeOut" }}
              style={{ position:"absolute", left:x, top:y, width:sz, height:sz, borderRadius:"50%", background:col, filter:"blur(90px)", pointerEvents:"none" }}/>
          ))}

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:100, background:T.accent+"20", border:`1px solid ${T.accent+"40"}`, color:T.accentL, fontSize:12, fontWeight:700, marginBottom:24 }}>
              <Zap size={13}/>How Evenova Works
            </div>
            <h1 className="outfit" style={{ fontSize: mobile ? 32 : 54, fontWeight: 900, color: T.text, lineHeight: 1.08, marginBottom: 18 }}>
              Events made simple.<br/>
              <span style={{ background:`linear-gradient(135deg,${T.accent},${T.accentL},${T.gold})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                From setup to scan-in.
              </span>
            </h1>
            <p style={{ fontSize: mobile ? 15 : 18, color: T.muted, maxWidth: 540, margin: "0 auto 32px", lineHeight: 1.75 }}>
              Whether you're running a 50-person dinner or a 5,000-person concert — Evenova handles ticketing, payments, and access control end-to-end.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Btn sz="lg" onClick={() => onNav("register")}>Start for Free <ArrowRight size={16}/></Btn>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Btn sz="lg" v="secondary" onClick={() => onNav("explore")}>Explore Events</Btn>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* ── Steps ── */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: mobile ? "40px 20px 80px" : "40px 24px 80px" }}>

          {/* Organizer section */}
          <Reveal variants={fadeLeft} style={{ marginBottom: 36 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: 40 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:T.accent+"25", border:`1px solid ${T.accent+"40"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Settings size={20} color={T.accent}/>
              </div>
              <div>
                <span style={{ fontSize:11, fontWeight:700, color:T.accent, textTransform:"uppercase", letterSpacing:".08em" }}>Running an event?</span>
                <h2 className="outfit" style={{ fontSize:26, fontWeight:800, color:T.text, lineHeight:1.1 }}>For Organizers</h2>
              </div>
            </div>
          </Reveal>

          <StaggerReveal stagger={0.08} style={{ display:"flex", flexDirection:"column", gap:32, marginBottom:80 }}>
            {ORGANIZER_STEPS.map((s,i) => <Step key={i} num={i+1} {...s}/>)}
          </StaggerReveal>

          {/* Divider */}
          <Reveal>
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:80 }}>
              <div style={{ flex:1, height:1, background:T.border }}/>
              <div style={{ padding:"6px 16px", borderRadius:100, border:`1px solid ${T.border}`, fontSize:12, color:T.muted, fontWeight:600 }}>or</div>
              <div style={{ flex:1, height:1, background:T.border }}/>
            </div>
          </Reveal>

          {/* Attendee section */}
          <Reveal variants={fadeRight} style={{ marginBottom: 36 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: 40 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:T.gold+"25", border:`1px solid ${T.gold+"40"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Ticket size={20} color={T.gold}/>
              </div>
              <div>
                <span style={{ fontSize:11, fontWeight:700, color:T.gold, textTransform:"uppercase", letterSpacing:".08em" }}>Buying a ticket?</span>
                <h2 className="outfit" style={{ fontSize:26, fontWeight:800, color:T.text, lineHeight:1.1 }}>For Attendees</h2>
              </div>
            </div>
          </Reveal>

          <StaggerReveal stagger={0.08} style={{ display:"flex", flexDirection:"column", gap:32, marginBottom:80 }}>
            {ATTENDEE_STEPS.map((s,i) => <Step key={i} num={i+1} {...s}/>)}
          </StaggerReveal>

          {/* CTA */}
          <Reveal variants={scaleIn}>
            <motion.div whileHover={{ scale: 1.01 }} style={{
              textAlign:"center", padding:"48px 32px", borderRadius:28,
              border:`1px solid ${T.border}`,
              background:"linear-gradient(135deg,rgba(124,58,237,0.06),rgba(245,158,11,0.04))",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at 50% 0%,${T.accent}14,transparent 65%)`, pointerEvents:"none" }}/>
              <h2 className="outfit" style={{ fontSize:30, fontWeight:800, color:T.text, marginBottom:12 }}>Ready to run your event?</h2>
              <p style={{ color:T.muted, fontSize:15, marginBottom:28 }}>Free to start. No setup fee. Pay only when you sell tickets.</p>
              <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Btn sz="lg" onClick={() => onNav("register")}>Create Your Event <ArrowRight size={16}/></Btn>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Btn sz="lg" v="secondary" onClick={() => onNav("contact")}>Talk to Us</Btn>
                </motion.div>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </PageMotion>
  );
}
