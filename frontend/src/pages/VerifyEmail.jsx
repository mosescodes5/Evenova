import { useEffect, useState } from "react";
import { ShieldCheck, MailCheck, XCircle } from "lucide-react";
import { GA, T } from "../styles/theme.js";
import { Btn, Card } from "../components/ui/index.jsx";
import { api } from "../utils/api.js";

/**
 * Two modes, decided automatically by whether `token` is present:
 *
 * 1. Link mode (token present, e.g. user clicked the email link):
 *    Auto-calls api.verifyEmail(token) on mount and shows success/error.
 *
 * 2. Awaiting mode (no token, e.g. right after Register submits):
 *    Shows "check your inbox" with a resend button — no code entry,
 *    since verification now happens by clicking the emailed link.
 */
export default function VerifyEmail({ email, token, onNav }) {
  const [status, setStatus] = useState(token ? "checking" : "awaiting"); // checking | success | error | awaiting
  const [message, setMessage] = useState("");
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.verifyEmail(token);
        if (cancelled) return;
        setStatus("success");
        setMessage(res.message || "Email verified! You can now log in.");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e.message || "This link is invalid or has expired.");
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    try {
      await api.resendVerification(email);
      setResent(true);
      setTimeout(() => setResent(false), 30000);
    } catch {
      // resend-verification never reveals account existence, so this practically never errors —
      // but guard anyway so the button doesn't hang on a network blip.
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,paddingTop:80}}>
      <div style={{width:"100%",maxWidth:420,textAlign:"center"}}>
        <div style={{width:64,height:64,borderRadius:20,
          background: status === "error" ? T.danger : GA,
          display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
          {status === "checking" && <ShieldCheck size={30} color="white"/>}
          {status === "success"  && <ShieldCheck size={30} color="white"/>}
          {status === "error"    && <XCircle size={30} color="white"/>}
          {status === "awaiting" && <MailCheck size={30} color="white"/>}
        </div>

        {status === "checking" && (
          <>
            <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text,marginBottom:8}}>Verifying your email…</h1>
            <p style={{color:T.muted,fontSize:14}}>One moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text,marginBottom:8}}>Email verified ✓</h1>
            <p style={{color:T.muted,fontSize:14,lineHeight:1.7,marginBottom:24}}>{message}</p>
            <Card style={{padding:24}}>
              <Btn full sz="lg" onClick={() => onNav("login")}>Go to Login</Btn>
            </Card>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text,marginBottom:8}}>Link didn't work</h1>
            <p style={{color:T.danger,fontSize:14,lineHeight:1.7,marginBottom:24}}>{message}</p>
            <Card style={{padding:24,display:"flex",flexDirection:"column",gap:12}}>
              {email && (
                <Btn full sz="lg" onClick={handleResend} disabled={resending || resent}>
                  {resent ? "New link sent ✓" : resending ? "Sending…" : "Send a new link"}
                </Btn>
              )}
              <Btn full v="secondary" onClick={() => onNav("login")}>Back to Login</Btn>
            </Card>
          </>
        )}

        {status === "awaiting" && (
          <>
            <h1 className="outfit" style={{fontSize:26,fontWeight:800,color:T.text,marginBottom:8}}>Check your email</h1>
            <p style={{color:T.muted,fontSize:14,lineHeight:1.7,marginBottom:28}}>
              We sent a verification link to<br/>
              <span style={{color:T.accentL,fontWeight:700}}>{email}</span>
              <br/>Click it to confirm your address — the link is valid for 24 hours.
            </p>
            <Card style={{padding:28}}>
              <p style={{fontSize:13,color:T.muted,marginBottom:14}}>
                Didn't get it? Check spam, or send a new one.
              </p>
              <Btn full sz="lg" onClick={handleResend} disabled={resending || resent}>
                {resent ? "Link resent ✓" : resending ? "Sending…" : "Resend Link"}
              </Btn>
              <div style={{marginTop:16}}>
                <button onClick={() => onNav("login")}
                  style={{color:T.accentL,background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:13}}>
                  Already verified? Log in
                </button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}