import { useState } from "react";
import { Sparkles } from "lucide-react";
import { GA, T } from "../styles/theme.js";
import { Btn, Card, Inp } from "../components/ui/index.jsx";
import { api } from "../utils/api.js";
import { KEYS, storSet } from "../utils/storage.js";

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

export default function Login({ onLogin, onNav }) {
  const [email, setEmail]   = useState("");
  const [pw, setPw]         = useState("");
  const [err, setErr]       = useState("");
  const [errType, setErrType] = useState(""); // "no_account" | "wrong_pw" | "pending" | "rejected" | ""
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setErr(""); setErrType("");
    if (!email || !pw) { setErr("Email and password are required."); return; }

    setLoading(true);
    try {
      const { token, user } = await api.login(email, pw);
      storSet(KEYS.TOKEN, token);
      onLogin(user);
    } catch (e) {
      // Map the backend's error responses to the UI hints this page already has.
      if (e.status === 403 && e.code === "EMAIL_NOT_VERIFIED") {
        setErr("Please verify your email before logging in."); setErrType("verifying");
      } else if (e.status === 403 && /pending/i.test(e.message)) {
        setErr("Your application is under review. We'll notify you within 24–48 hrs."); setErrType("pending");
      } else if (e.status === 403) {
        setErr("Your application was not approved. Contact support@evenova.ng for help."); setErrType("rejected");
      } else if (e.status === 401) {
        // The API intentionally doesn't distinguish "no account" from "wrong password"
        // (avoids leaking which emails are registered) — show a neutral message.
        setErr("Incorrect email or password."); setErrType("wrong_pw");
      } else {
        setErr(e.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Action hint beneath the error
  const renderErrAction = () => {
    if (errType === "no_account") return (
      <button onClick={()=>onNav("register")}
        style={{marginTop:8,display:"block",fontSize:12,color:T.accentL,background:"none",border:"none",cursor:"pointer",fontWeight:700,textDecoration:"underline"}}>
        Register as an organizer →
      </button>
    );
    if (errType === "wrong_pw") return (
      <button onClick={()=>onNav("forgot-password")}
        style={{marginTop:8,display:"block",fontSize:12,color:T.accentL,background:"none",border:"none",cursor:"pointer",fontWeight:700,textDecoration:"underline"}}>
        Forgot your password?
      </button>
    );
    if (errType === "verifying") return (
      <button onClick={()=>onNav("verify-email")}
        style={{marginTop:8,display:"block",fontSize:12,color:T.accentL,background:"none",border:"none",cursor:"pointer",fontWeight:700,textDecoration:"underline"}}>
        Go to verification →
      </button>
    );
    return null;
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,paddingTop:80}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:52,height:52,borderRadius:18,background:GA,display:"flex",alignItems:"center",
            justifyContent:"center",margin:"0 auto 12px"}}><Sparkles size={24} color="white"/></div>
          <h1 className="outfit" style={{fontSize:26,fontWeight:800,color:T.text}}>Welcome back</h1>
          <p style={{color:T.muted,fontSize:14,marginTop:4}}>Sign in to your Evenova account</p>
          {/* (admin mode badge removed along with the keyboard backdoor) */}
        </div>
        <Card style={{padding:28}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Inp label="Email Address" type="email" value={email} onChange={v=>{setEmail(v);setErr("");setErrType("");}} placeholder="you@organization.com"/>

            {/* Password field */}
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <label style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Password</label>
                <button onClick={()=>onNav("forgot-password")}
                  style={{fontSize:11,color:T.accentL,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
                  Forgot password?
                </button>
              </div>
              <div style={{position:"relative",display:"flex",alignItems:"center"}}>
                <input
                  type={showPw?"text":"password"}
                  value={pw}
                  onChange={e=>{setPw(e.target.value);setErr("");setErrType("");}}
                  onKeyDown={e=>e.key==="Enter"&&handle()}
                  placeholder="••••••••"
                  style={{width:"100%",padding:"10px 44px 10px 14px",borderRadius:10,fontSize:14,
                    color:T.text,background:T.surface,border:`1px solid ${err?T.danger:T.border}`,
                    fontFamily:"inherit",outline:"none",transition:"border .18s"}}
                  onFocus={e=>e.target.style.borderColor=T.accent}
                  onBlur={e=>e.target.style.borderColor=err?T.danger:T.border}
                />
                <button onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:12,background:"none",border:"none",
                  cursor:"pointer",padding:4,borderRadius:8,color:showPw?T.accentL:T.muted,display:"flex",alignItems:"center"}}>
                  <EyeIcon open={showPw}/>
                </button>
              </div>
            </div>

            {/* Error block */}
            {err && (
              <div style={{padding:"10px 14px",borderRadius:10,background:T.danger+"15",border:`1px solid ${T.danger+"30"}`,fontSize:13,color:T.danger}}>
                {err}
                {renderErrAction()}
              </div>
            )}

            <Btn full sz="lg" onClick={handle} disabled={loading}>{loading ? "Signing in…" : "Sign In"}</Btn>
          </div>
        </Card>

        <p style={{textAlign:"center",fontSize:13,color:T.muted,marginTop:16}}>
          New organizer?{" "}
          <button onClick={()=>onNav("register")} style={{color:T.accentL,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Apply here</button>
        </p>
      </div>
    </div>
  );
}
