import { useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { GA, T } from "../styles/theme.js";
import { Btn, Card } from "../components/ui/index.jsx";

export default function VerifyEmail({ email, onVerify, onResend }) {
  const [code, setCode] = useState(["","","","","",""]);
  const [err, setErr] = useState("");
  const [resent, setResent] = useState(false);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    setErr("");
    if (val && i < 5) {
      document.getElementById(`vc-${i+1}`)?.focus();
    }
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      document.getElementById(`vc-${i-1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      document.getElementById("vc-5")?.focus();
    }
  };

  const handleSubmit = () => {
    const entered = code.join("");
    if (entered.length < 6) { setErr("Enter the full 6-digit code"); return; }
    const ok = onVerify(entered);
    if (!ok) setErr("Incorrect code. Please try again.");
  };

  const handleResend = () => {
    onResend();
    setResent(true);
    setCode(["","","","","",""]);
    setTimeout(() => setResent(false), 30000);
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,paddingTop:80}}>
      <div style={{width:"100%",maxWidth:420,textAlign:"center"}}>
        <div style={{width:64,height:64,borderRadius:20,background:GA,display:"flex",alignItems:"center",
          justifyContent:"center",margin:"0 auto 20px"}}>
          <ShieldCheck size={30} color="white"/>
        </div>
        <h1 className="outfit" style={{fontSize:26,fontWeight:800,color:T.text,marginBottom:8}}>Check your email</h1>
        <p style={{color:T.muted,fontSize:14,lineHeight:1.7,marginBottom:28}}>
          We sent a 6-digit code to<br/>
          <span style={{color:T.accentL,fontWeight:700}}>{email}</span>
        </p>

        <Card style={{padding:28}}>
          {/* 6-digit input */}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20}}>
            {code.map((d,i) => (
              <input
                key={i}
                id={`vc-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
                onPaste={handlePaste}
                style={{
                  width:44, height:54, textAlign:"center", fontSize:22, fontWeight:800,
                  borderRadius:12, border:`2px solid ${d ? T.accent : T.border}`,
                  background:T.surface, color:T.text, outline:"none",
                  transition:"border .15s", caretColor:T.accent,
                  fontFamily:"monospace"
                }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = code[i] ? T.accent : T.border}
              />
            ))}
          </div>

          {err && (
            <div style={{padding:"10px 14px",borderRadius:10,background:T.danger+"15",
              border:`1px solid ${T.danger+"30"}`,fontSize:13,color:T.danger,marginBottom:14}}>
              {err}
            </div>
          )}

          <Btn full sz="lg" onClick={handleSubmit}>Verify & Activate Account</Btn>

          <div style={{marginTop:18,fontSize:13,color:T.muted}}>
            Didn't get the code?{" "}
            <button onClick={handleResend} disabled={resent}
              style={{color:resent?T.muted:T.accentL,background:"none",border:"none",
                cursor:resent?"default":"pointer",fontWeight:700,fontSize:13}}>
              {resent ? "Code resent ✓" : "Resend"}
            </button>
          </div>
        </Card>

        <p style={{fontSize:12,color:T.muted,marginTop:16}}>
          Wrong email? <button onClick={()=>window.location.reload()}
            style={{color:T.accentL,background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:12}}>
            Start over
          </button>
        </p>
      </div>
    </div>
  );
}