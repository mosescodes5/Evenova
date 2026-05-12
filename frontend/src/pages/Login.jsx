import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { GA, T } from "../styles/theme.js";
import { Bdg, Btn, Card, Inp } from "../components/ui/index.jsx";

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

export default function Login({ organizers, onLogin, onNav }) {
  const [email, setEmail]   = useState("");
  const [pw, setPw]         = useState("");
  const [err, setErr]       = useState("");
  const [errType, setErrType] = useState(""); // "no_account" | "wrong_pw" | "pending" | "rejected" | "verifying" | ""
  const [showPw, setShowPw] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  useEffect(()=>{
    const h = e => { if(e.ctrlKey&&e.shiftKey&&e.key==="A") setAdminMode(true); };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);

  const handle = () => {
    setErr(""); setErrType("");

    // Admin backdoor
    if (adminMode && email==="owner@evenova.ng" && pw==="EvenovaOwner#2025") {
      onLogin({ id:"admin", name:"Platform Admin", role:"admin" }); return;
    }

    // Check staff first (any org)
    for (const org of organizers) {
      const staff = org.staff?.find(s=>s.email===email);
      if (staff) {
        if (staff.password !== pw) {
          setErr("Incorrect password."); setErrType("wrong_pw"); return;
        }
        onLogin({...staff, orgId:org.id, orgName:org.name, role:"staff"}); return;
      }
    }

    // Check organizer accounts
    const matchEmail = organizers.find(o => o.email === email);
    if (!matchEmail) {
      setErr("No account found with this email."); setErrType("no_account"); return;
    }
    if (matchEmail.status === "verifying") {
      setErr("Email not verified yet. Check your inbox for the verification code."); setErrType("verifying"); return;
    }
    if (matchEmail.status === "pending") {
      setErr("Your application is under review. We'll notify you within 24–48 hrs."); setErrType("pending"); return;
    }
    if (matchEmail.status === "rejected") {
      setErr("Your application was not approved. Contact support@evenova.ng for help."); setErrType("rejected"); return;
    }
    if (matchEmail.password !== pw) {
      setErr("Incorrect password."); setErrType("wrong_pw"); return;
    }
    onLogin({...matchEmail, role:"organizer"});
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
          {adminMode && <Bdg color="red" sz="md" style={{marginTop:8}}>Admin Mode Active</Bdg>}
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

            <Btn full sz="lg" onClick={handle}>Sign In</Btn>
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
