import { useState } from "react";
import { Bell, CheckCircle, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { GA, T } from "../styles/theme.js";
import { Btn, Card, Inp } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";
import { genId } from "../utils/crypto.js";

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

function PwField({ label, value, onChange, hint, required }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em"}}>
        {label}{required && <span style={{color:T.danger,marginLeft:3}}>*</span>}
      </label>
      <div style={{position:"relative",display:"flex",alignItems:"center"}}>
        <input type={show?"text":"password"} value={value} onChange={e=>onChange(e.target.value)}
          style={{width:"100%",padding:"10px 44px 10px 14px",borderRadius:10,fontSize:14,
            color:T.text,background:T.surface,border:`1px solid ${focused?T.accent:T.border}`,
            fontFamily:"inherit",outline:"none",transition:"border .18s"}}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
        <button onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:12,background:"none",border:"none",
          cursor:"pointer",padding:4,borderRadius:8,color:show?T.accentL:T.muted,display:"flex",alignItems:"center"}}>
          <EyeIcon open={show}/>
        </button>
      </div>
      {hint && <p style={{fontSize:11,color:T.danger}}>{hint}</p>}
    </div>
  );
}

export default function Register({ onSubmit, onNav, error="", loading=false }) {
  const { mobile } = useMedia();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name:"", org:"", email:"", phone:"", teamSize:"5", pw:"", pw2:"" });
  const [err, setErr] = useState({});
  const set = k => v => setForm(f=>({...f,[k]:v}));

  const emailExists = error === "email_exists";
  const hasGenErr = error && !emailExists;

  const v1 = () => {
    const e={};
    if(!form.name.trim()) e.name="Required";
    if(!form.org.trim()) e.org="Required";
    if(!form.email.includes("@")) e.email="Valid email required";
    if(form.phone.length<8) e.phone="Required";
    setErr(e); return !Object.keys(e).length;
  };
  const v2 = () => {
    const e={};
    if(form.pw.length<6) e.pw="Min 6 characters";
    if(form.pw!==form.pw2) e.pw2="Passwords don't match";
    setErr(e); return !Object.keys(e).length;
  };
  const submit = () => {
    if (!v2()) return;
    onSubmit({ id:genId("ORG"), name:form.org, contactName:form.name, email:form.email.toLowerCase().trim(),
      phone:form.phone, status:"pending", teamSize:parseInt(form.teamSize), password:form.pw, staff:[] });
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,paddingTop:80}}>
      <div style={{width:"100%",maxWidth:480}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:52,height:52,borderRadius:18,background:GA,display:"flex",alignItems:"center",
            justifyContent:"center",margin:"0 auto 12px"}}><Sparkles size={24} color="white"/></div>
          <h1 className="outfit" style={{fontSize:26,fontWeight:800,color:T.text}}>Join Evenova</h1>
          <p style={{color:T.muted,fontSize:14,marginTop:4}}>Apply to become a verified organizer</p>
        </div>

        {/* Step dots */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:24}}>
          {[1,2].map(s=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:8,flex:s<2?1:0}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:step>=s?GA:T.border,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"white",flexShrink:0}}>
                {step>s?<CheckCircle size={14}/>:s}
              </div>
              {s<2 && <div style={{flex:1,height:2,background:step>1?GA:T.border,borderRadius:1}}/>}
            </div>
          ))}
        </div>

        <Card style={{padding:28}}>
          <h2 style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:4}}>
            {step===1?"Contact Details":"Create Password"}
          </h2>
          <p style={{fontSize:13,color:T.muted,marginBottom:emailExists||hasGenErr?12:20}}>
            {step===1?"We'll send a verification code to this email.":"Choose a secure password for your account."}
          </p>

          {/* Email already exists */}
          {emailExists && (
            <div style={{padding:"14px 16px",borderRadius:12,background:T.danger+"15",
              border:`1px solid ${T.danger+"40"}`,marginBottom:16}}>
              <p style={{fontSize:14,fontWeight:700,color:T.danger,marginBottom:4}}>⚠️ Email already registered</p>
              <p style={{fontSize:13,color:T.muted,lineHeight:1.6}}>
                An account with <strong style={{color:T.text}}>{form.email}</strong> already exists.
              </p>
              <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                <Btn sz="sm" onClick={()=>onNav("login")}>Log in instead →</Btn>
                <Btn sz="sm" v="secondary" onClick={()=>onNav("forgot-password")}>Forgot password?</Btn>
              </div>
            </div>
          )}

          {/* General error */}
          {hasGenErr && (
            <div style={{padding:"10px 14px",borderRadius:10,background:T.danger+"15",
              border:`1px solid ${T.danger+"30"}`,fontSize:13,color:T.danger,marginBottom:16}}>
              {error}
            </div>
          )}

          {step===1 ? (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Inp label="Full Name" value={form.name} onChange={set("name")} required hint={err.name}/>
              <Inp label="Organization Name" value={form.org} onChange={set("org")} placeholder="e.g. Amara Events Co." required hint={err.org}/>
              <Inp label="Contact Email" type="email" value={form.email} onChange={set("email")} required hint={err.email}/>
              <Inp label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="+234 801 234 5678" required hint={err.phone}/>
              <Inp label="Team Size" value={form.teamSize} onChange={set("teamSize")}
                options={["1","2","3","5","8","10","15","20"].map(v=>({value:v,label:`${v} staff accounts`}))}/>
              <Btn full sz="lg" onClick={()=>v1()&&setStep(2)}>Continue <ChevronRight size={14}/></Btn>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <PwField label="Create Password" value={form.pw} onChange={set("pw")} required hint={err.pw}/>
              <PwField label="Confirm Password" value={form.pw2} onChange={set("pw2")} required hint={err.pw2}/>
              <div style={{padding:12,borderRadius:10,background:T.gold+"15",border:`1px solid ${T.gold+"30"}`,fontSize:12,color:T.gold}}>
                <Bell size={12} style={{display:"inline",marginRight:6}}/>A verification code will be sent to your email immediately.
              </div>
              <div style={{display:"flex",gap:10}}>
                <Btn v="secondary" onClick={()=>setStep(1)} disabled={loading}><ChevronLeft size={14}/>Back</Btn>
                <Btn full onClick={submit} disabled={loading}>
                  {loading
                    ? <span style={{display:"flex",alignItems:"center",gap:8}}><span className="spin" style={{width:14,height:14,border:"2px solid white",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block"}}/>Submitting…</span>
                    : "Submit Application"}
                </Btn>
              </div>
            </div>
          )}
        </Card>

        <p style={{textAlign:"center",fontSize:13,color:T.muted,marginTop:16}}>
          Already have an account?{" "}
          <button onClick={()=>onNav("login")} style={{color:T.accentL,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Log in</button>
        </p>
      </div>
    </div>
  );
}
