import { useState } from "react";
import { Bell, Building2, CheckCircle, ChevronLeft, ChevronRight, Sparkles, User } from "lucide-react";
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
    <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
      <label style={{ fontSize:11,fontWeight:700,color:"var(--ev-muted)",textTransform:"uppercase",letterSpacing:".06em" }}>
        {label}{required && <span style={{ color:"var(--ev-danger)",marginLeft:3 }}>*</span>}
      </label>
      <div style={{ position:"relative",display:"flex",alignItems:"center" }}>
        <input type={show?"text":"password"} value={value} onChange={e=>onChange(e.target.value)}
          style={{ width:"100%",padding:"10px 44px 10px 14px",borderRadius:10,fontSize:14,
            color:T.text,background:"var(--ev-surface)",border:`1px solid ${focused?T.accent:T.border}`,
            fontFamily:"inherit",outline:"none",transition:"border .18s" }}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
        <button onClick={()=>setShow(v=>!v)} style={{ position:"absolute",right:12,background:"none",border:"none",
          cursor:"pointer",padding:4,borderRadius:8,color:show?"var(--ev-accentL)":"var(--ev-muted)",display:"flex",alignItems:"center" }}>
          <EyeIcon open={show}/>
        </button>
      </div>
      {hint && <p style={{ fontSize:11,color:"var(--ev-danger)" }}>{hint}</p>}
    </div>
  );
}

// ── Account type selector ────────────────────────────────────
function AccountTypeSelector({ value, onChange }) {
  const types = [
    {
      id: "individual",
      icon: User,
      label: "Individual",
      sub: "Selling tickets as a person",
      detail: "Get paid into your personal bank account. Perfect for freelance event hosts and sole traders.",
    },
    {
      id: "organisation",
      icon: Building2,
      label: "Organisation",
      sub: "Selling tickets as a business",
      detail: "Get paid into a business bank account. For companies, NGOs, agencies and registered businesses.",
    },
  ];

  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
      {types.map(({ id, icon: Icon, label, sub, detail }) => {
        const selected = value === id;
        return (
          <div key={id} onClick={() => onChange(id)}
            style={{
              padding:20,borderRadius:16,cursor:"pointer",transition:"all .2s",
              border:`2px solid ${selected ? "var(--ev-accent)" : "var(--ev-border)"}`,
              background: selected ? "var(--ev-accent)12" : "var(--ev-surface)",
            }}>
            <div style={{ width:44,height:44,borderRadius:12,
              background: selected ? "var(--ev-accent)22" : "var(--ev-border)40",
              display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,transition:"background .2s" }}>
              <Icon size={22} style={{ color: selected ? "var(--ev-accentL)" : "var(--ev-muted)" }}/>
            </div>
            <p style={{ fontSize:15,fontWeight:700,color: selected ? T.text : "var(--ev-muted)",marginBottom:3 }}>{label}</p>
            <p style={{ fontSize:12,color:"var(--ev-muted)",lineHeight:1.5 }}>{detail}</p>
            {selected && (
              <div style={{ display:"flex",alignItems:"center",gap:5,marginTop:10 }}>
                <CheckCircle size={13} color="var(--ev-success)"/>
                <span style={{ fontSize:11,color:"var(--ev-success)",fontWeight:700 }}>Selected</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Register({ onSubmit, onNav, error = "", loading = false }) {
  const { mobile } = useMedia();
  const [step, setStep] = useState(0); // 0=account type, 1=details, 2=password
  const [accountType, setAccountType] = useState("individual");
  const [form, setForm] = useState({ name:"", org:"", email:"", phone:"", teamSize:"5", pw:"", pw2:"" });
  const [err, setErr] = useState({});
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const emailExists = error === "email_exists";
  const hasGenErr = error && !emailExists;

  const v1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (accountType === "organisation" && !form.org.trim()) e.org = "Required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (form.phone.length < 8) e.phone = "Required";
    setErr(e);
    return !Object.keys(e).length;
  };

  const v2 = () => {
    const e = {};
    if (form.pw.length < 6) e.pw = "Min 6 characters";
    if (form.pw !== form.pw2) e.pw2 = "Passwords don't match";
    setErr(e);
    return !Object.keys(e).length;
  };

  const submit = () => {
    if (!v2()) return;
    onSubmit({
      id: genId("ORG"),
      accountType, // "individual" | "organisation"
      name: accountType === "individual" ? form.name : form.org,
      contactName: form.name,
      email: form.email.toLowerCase().trim(),
      phone: form.phone,
      status: "pending",
      teamSize: parseInt(form.teamSize),
      password: form.pw,
      staff: [],
      balance: 0,
      totalEarned: 0,
      totalPaidOut: 0,
    });
  };

  const STEPS = ["Account Type", "Your Details", "Set Password"];
  const isOrg = accountType === "organisation";

  return (
    <div style={{ minHeight:"100vh",background:"var(--ev-bg)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,paddingTop:80 }}>
      <div style={{ width:"100%",maxWidth:520 }}>
        {/* Logo */}
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <div style={{ width:52,height:52,borderRadius:18,background:GA,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
            <Sparkles size={24} color="white"/>
          </div>
          <h1 className="outfit" style={{ fontSize:26,fontWeight:800,color:T.text }}>Join Evenova</h1>
          <p style={{ color:"var(--ev-muted)",fontSize:14,marginTop:4 }}>
            {step === 0 ? "Choose how you'll use Evenova" : step === 1 ? "Tell us about yourself" : "Secure your account"}
          </p>
        </div>

        {/* Step bar */}
        <div style={{ display:"flex",gap:4,padding:4,background:"var(--ev-surface)",borderRadius:14,marginBottom:24 }}>
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => { if (i < step) setStep(i); }}
              style={{ flex:1,padding:"8px 4px",borderRadius:10,border:"none",fontWeight:700,fontSize:12,
                background: step === i ? "var(--ev-card)" : "transparent",
                color: step === i ? T.text : step > i ? "var(--ev-success)" : "var(--ev-muted)",
                cursor: i < step ? "pointer" : "default",transition:"all .2s" }}>
              <span style={{ width:20,height:20,borderRadius:"50%",
                background: step > i ? "var(--ev-success)" : step === i ? GA : "var(--ev-border)",
                color:"white",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,marginRight:6 }}>
                {step > i ? <CheckCircle size={11}/> : i + 1}
              </span>
              <span className="hide-mobile">{s}</span>
            </button>
          ))}
        </div>

        <Card style={{ padding:28 }}>
          {/* Step 0 — Account type */}
          {step === 0 && (
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
              <div>
                <h2 style={{ fontSize:17,fontWeight:700,color:T.text,marginBottom:4 }}>What type of account do you need?</h2>
                <p style={{ fontSize:13,color:"var(--ev-muted)",marginBottom:16 }}>This determines how you'll receive your earnings from ticket sales.</p>
                <AccountTypeSelector value={accountType} onChange={setAccountType}/>
              </div>
              <Btn full sz="lg" onClick={() => setStep(1)}>
                Continue as {accountType === "individual" ? "Individual" : "Organisation"} <ChevronRight size={14}/>
              </Btn>
            </div>
          )}

          {/* Step 1 — Details */}
          {step === 1 && (
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
              <h2 style={{ fontSize:17,fontWeight:700,color:T.text,marginBottom:-8 }}>
                {isOrg ? "Organisation Details" : "Your Details"}
              </h2>

              {emailExists && (
                <div style={{ padding:"14px 16px",borderRadius:12,background:"var(--ev-danger)15",border:"1px solid var(--ev-danger)40" }}>
                  <p style={{ fontSize:14,fontWeight:700,color:"var(--ev-danger)",marginBottom:4 }}>⚠️ Email already registered</p>
                  <p style={{ fontSize:13,color:"var(--ev-muted)",lineHeight:1.6 }}>An account with <strong style={{ color:T.text }}>{form.email}</strong> already exists.</p>
                  <div style={{ display:"flex",gap:8,marginTop:12,flexWrap:"wrap" }}>
                    <Btn sz="sm" onClick={() => onNav("login")}>Log in instead →</Btn>
                    <Btn sz="sm" v="secondary" onClick={() => onNav("forgot-password")}>Forgot password?</Btn>
                  </div>
                </div>
              )}
              {hasGenErr && (
                <div style={{ padding:"10px 14px",borderRadius:10,background:"var(--ev-danger)15",border:"1px solid var(--ev-danger)30",fontSize:13,color:"var(--ev-danger)" }}>{error}</div>
              )}

              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                <Inp label={isOrg ? "Your Full Name (Contact Person)" : "Full Name"} value={form.name} onChange={set("name")} required hint={err.name}/>
                {isOrg && <Inp label="Organisation Name" value={form.org} onChange={set("org")} placeholder="e.g. Amara Events Co." required hint={err.org}/>}
                <Inp label="Email Address" type="email" value={form.email} onChange={set("email")} required hint={err.email}/>
                <Inp label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="+234 801 234 5678" required hint={err.phone}/>
                {isOrg && (
                  <Inp label="Team Size" value={form.teamSize} onChange={set("teamSize")}
                    options={["1","2","3","5","8","10","15","20"].map(v => ({ value:v, label:`${v} staff accounts` }))}/>
                )}
              </div>

              {/* Account type summary */}
              <div style={{ padding:12,borderRadius:12,background:"var(--ev-accent)10",border:"1px solid var(--ev-accent)30",display:"flex",alignItems:"center",gap:10 }}>
                {isOrg ? <Building2 size={16} color="var(--ev-accentL)"/> : <User size={16} color="var(--ev-accentL)"/>}
                <div>
                  <p style={{ fontSize:12,fontWeight:700,color:"var(--ev-accentL)" }}>{isOrg ? "Organisation Account" : "Individual Account"}</p>
                  <p style={{ fontSize:11,color:"var(--ev-muted)" }}>
                    {isOrg ? "Earnings paid to business bank account." : "Earnings paid to your personal bank account."}
                    {" "}<button onClick={() => setStep(0)} style={{ background:"none",border:"none",color:"var(--ev-accentL)",fontSize:11,cursor:"pointer",textDecoration:"underline",padding:0 }}>Change</button>
                  </p>
                </div>
              </div>

              <div style={{ display:"flex",gap:10 }}>
                <Btn v="secondary" onClick={() => setStep(0)}><ChevronLeft size={14}/>Back</Btn>
                <Btn full onClick={() => v1() && setStep(2)}>Continue <ChevronRight size={14}/></Btn>
              </div>
            </div>
          )}

          {/* Step 2 — Password */}
          {step === 2 && (
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <h2 style={{ fontSize:17,fontWeight:700,color:T.text,marginBottom:4 }}>Create Password</h2>
              <PwField label="Create Password" value={form.pw} onChange={set("pw")} required hint={err.pw}/>
              <PwField label="Confirm Password" value={form.pw2} onChange={set("pw2")} required hint={err.pw2}/>
              <div style={{ padding:12,borderRadius:10,background:"var(--ev-gold)15",border:"1px solid var(--ev-gold)30",fontSize:12,color:"var(--ev-gold)" }}>
                <Bell size={12} style={{ display:"inline",marginRight:6 }}/>A 6-digit verification code will be sent to <strong>{form.email}</strong> immediately.
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <Btn v="secondary" onClick={() => setStep(1)} disabled={loading}><ChevronLeft size={14}/>Back</Btn>
                <Btn full onClick={submit} disabled={loading}>
                  {loading
                    ? <span style={{ display:"flex",alignItems:"center",gap:8 }}><span className="spin" style={{ width:14,height:14,border:"2px solid white",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block" }}/>Submitting…</span>
                    : "Submit Application"}
                </Btn>
              </div>
            </div>
          )}
        </Card>

        <p style={{ textAlign:"center",fontSize:13,color:"var(--ev-muted)",marginTop:16 }}>
          Already have an account?{" "}
          <button onClick={() => onNav("login")} style={{ color:"var(--ev-accentL)",background:"none",border:"none",cursor:"pointer",fontWeight:600 }}>Log in</button>
        </p>
      </div>
    </div>
  );
}
