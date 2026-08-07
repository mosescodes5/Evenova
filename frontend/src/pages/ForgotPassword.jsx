import { useState } from "react";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { GA, T } from "../styles/theme.js";
import { Btn, Card } from "../components/ui/index.jsx";

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

/* ── Step 1 — Enter email ───────────────────────────────── */
function StepEmail({ onSend, onBack, loading }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  const handle = () => {
    setErr("");
    if (!email.includes("@")) { setErr("Enter a valid email address."); return; }
    onSend(email.trim().toLowerCase());
  };

  return (
    <>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ width:64, height:64, borderRadius:20, background:GA, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <Mail size={28} color="white"/>
        </div>
        <h1 className="outfit" style={{ fontSize:26, fontWeight:800, color:T.text, marginBottom:6 }}>Forgot password?</h1>
        <p style={{ color:T.muted, fontSize:14 }}>We'll email you a reset code. It expires in 30 minutes.</p>
      </div>
      <Card style={{ padding:28 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em" }}>
              Email Address <span style={{ color:T.danger }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handle()}
              placeholder="you@organization.com"
              style={{ padding:"10px 14px", borderRadius:10, fontSize:14, color:T.text, background:T.surface,
                border:`1px solid ${err ? T.danger : T.border}`, fontFamily:"inherit", outline:"none" }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = err ? T.danger : T.border}
            />
          </div>
          {err && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:T.danger+"15", border:`1px solid ${T.danger+"30"}`, fontSize:13, color:T.danger }}>
              {err}
            </div>
          )}
          <Btn full sz="lg" onClick={handle} disabled={loading}>
            {loading ? "Sending…" : "Send Reset Code"}
          </Btn>
          <button onClick={onBack} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:13, marginTop:4 }}>
            <ArrowLeft size={14}/> Back to login
          </button>
        </div>
      </Card>
    </>
  );
}

/* ── Step 2 — Enter code + new password ─────────────────── */
function StepReset({ email, onVerify, onResend, loading }) {
  const [code, setCode] = useState(["","","","","",""]);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [resent, setResent] = useState(false);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code]; next[i] = val; setCode(next); setErr("");
    if (val && i < 5) document.getElementById(`fp-${i+1}`)?.focus();
  };
  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) document.getElementById(`fp-${i-1}`)?.focus();
  };
  const handlePaste = (e) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0,6);
    if (p.length === 6) { setCode(p.split("")); document.getElementById("fp-5")?.focus(); }
  };

  const handle = () => {
    setErr("");
    const entered = code.join("");
    if (entered.length < 6) { setErr("Enter the full 6-digit code."); return; }
    if (pw.length < 8) { setErr("New password must be at least 8 characters."); return; }
    if (pw !== pw2) { setErr("Passwords don't match."); return; }
    onVerify(email, entered, pw);
  };

  const doResend = () => {
    onResend(email);
    setResent(true);
    setCode(["","","","","",""]);
    setTimeout(() => setResent(false), 30000);
  };

  return (
    <>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ width:64, height:64, borderRadius:20, background:GA, display:"flex", alignItems:"center",
          justifyContent:"center", margin:"0 auto 20px" }}>
          <ShieldCheck size={28} color="white"/>
        </div>
        <h1 className="outfit" style={{ fontSize:24, fontWeight:800, color:T.text, marginBottom:6 }}>Check your email</h1>
        <p style={{ color:T.muted, fontSize:14, lineHeight:1.7 }}>
          We sent a 6-digit code to<br/>
          <span style={{ color:T.accentL, fontWeight:700 }}>{email}</span>
        </p>
      </div>
      <Card style={{ padding:28 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Code input */}
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>Reset Code</p>
            <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
              {code.map((d, i) => (
                <input key={i} id={`fp-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKey(i, e)}
                  onPaste={handlePaste}
                  style={{ width:44, height:52, textAlign:"center", fontSize:20, fontWeight:800,
                    borderRadius:12, border:`2px solid ${d ? T.accent : T.border}`,
                    background:T.surface, color:T.text, outline:"none", fontFamily:"monospace" }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = code[i] ? T.accent : T.border}
                />
              ))}
            </div>
          </div>

          {/* New password */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em" }}>
              New Password <span style={{ color:T.danger }}>*</span>
            </label>
            <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
              <input type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
                placeholder="Min 8 characters" style={{ width:"100%", padding:"10px 44px 10px 14px",
                  borderRadius:10, fontSize:14, color:T.text, background:T.surface,
                  border:`1px solid ${T.border}`, fontFamily:"inherit", outline:"none" }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.border}
              />
              <button onClick={() => setShowPw(v=>!v)} style={{ position:"absolute", right:12, background:"none",
                border:"none", cursor:"pointer", color:showPw?T.accentL:T.muted, display:"flex", alignItems:"center" }}>
                <EyeIcon open={showPw}/>
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em" }}>
              Confirm Password <span style={{ color:T.danger }}>*</span>
            </label>
            <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
              placeholder="Same as above" style={{ padding:"10px 14px", borderRadius:10, fontSize:14,
                color:T.text, background:T.surface, border:`1px solid ${T.border}`, fontFamily:"inherit", outline:"none" }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
              onKeyDown={e => e.key === "Enter" && handle()}
            />
          </div>

          {err && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:T.danger+"15",
              border:`1px solid ${T.danger+"30"}`, fontSize:13, color:T.danger }}>
              {err}
            </div>
          )}

          <Btn full sz="lg" onClick={handle} disabled={loading}>
            {loading ? "Updating…" : <><KeyRound size={14} style={{ marginRight:6 }}/>Reset Password</>}
          </Btn>

          <div style={{ textAlign:"center", fontSize:13, color:T.muted }}>
            Didn't get the code?{" "}
            <button onClick={doResend} disabled={resent}
              style={{ color:resent?T.muted:T.accentL, background:"none", border:"none",
                cursor:resent?"default":"pointer", fontWeight:700, fontSize:13 }}>
              {resent ? "Code resent ✓" : "Resend"}
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}

/* ── Main export ─────────────────────────────────────────── */
export default function ForgotPassword({ onSendCode, onVerifyReset, onResendCode, onBack, loading }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");

  const handleSend = (em) => {
    setEmail(em);
    onSendCode(em, () => setStep(2));
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center",
      justifyContent:"center", padding:20, paddingTop:80 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        {step === 1
          ? <StepEmail onSend={handleSend} onBack={onBack} loading={loading}/>
          : <StepReset email={email} onVerify={onVerifyReset} onResend={em => onSendCode(em, ()=>{})} loading={loading}/>
        }
      </div>
    </div>
  );
}
