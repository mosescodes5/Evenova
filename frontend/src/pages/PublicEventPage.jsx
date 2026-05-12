import { useState } from "react";
import { Calendar, CheckCircle, ChevronLeft, Mail, MapPin, Ticket } from "lucide-react";
import { EVENT_BANNERS, T } from "../styles/theme.js";
import { Bdg, Btn, Card, Inp, QRDisplay } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";
import { genId, encodeTicket, verifyQR } from "../utils/crypto.js";
import { sendEmail, sendTicketEmail } from "../utils/email.js";
import { openPaystackCheckout, openFlutterwaveCheckout } from "../utils/payment.js";

export default function PublicEventPage({ event, onBack, onRegister, notify }) {
  const { mobile } = useMedia();
  const [selTypeId, setSelTypeId] = useState(Object.keys(event.ticketTypes)[1]||Object.keys(event.ticketTypes)[0]);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [payStep, setPayStep] = useState("form");
  const [success, setSuccess] = useState(null);
  const selType = event.ticketTypes[selTypeId];
  const payProvider = window._evPayCfg?.provider || "none";
  const isFree = !selType?.price || selType.price === 0;
  const setF = (id,v) => setFormData(f=>({...f,[id]:v}));

  const issueTicket = async (payRef) => {
    const tId=genId("TKT"), uId=genId("USR");
    const holderName = formData[event.regFields[0]?.id]||"Attendee";
    const holderEmail = formData[event.regFields[1]?.id]||"";
    const holderPhone = formData[event.regFields[2]?.id]||"";
    const ticket = { id:tId, evId:event.id, uId, gId:Object.keys(event.gates)[0], tpId:selTypeId,
      code:encodeTicket(event.id,tId,uId), holderName, holderEmail, holderPhone,
      status:"unused", customData:formData, registeredAt:new Date().toISOString(),
      paymentRef:payRef||null, paymentStatus:payRef?"paid":(isFree?"free":"pending") };
    const reg = { id:genId("REG"), tId, uId, evId:event.id, typeId:selTypeId, data:formData, holderName, holderEmail, code:ticket.code };
    onRegister(event.id, reg, ticket);
    if (holderEmail) await sendTicketEmail(ticket, event, selType, notify);
    setSuccess({ ...reg, ticket });
    setSubmitting(false);
    setPayStep("done");
  };

  const submit = async () => {
    const missing = event.regFields.filter(f=>f.required&&!formData[f.id]);
    if (missing.length) { notify("Fill required: "+missing.map(f=>f.label).join(", "),"error"); return; }
    setSubmitting(true);
    if (isFree || payProvider==="none" || payProvider==="bank") { await issueTicket(null); return; }
    const holderEmail=formData[event.regFields[1]?.id]||"";
    const holderName=formData[event.regFields[0]?.id]||"Attendee";
    const holderPhone=formData[event.regFields[2]?.id]||"";
    if (payProvider==="paystack") {
      setSubmitting(false); setPayStep("paying");
      try { await openPaystackCheckout({ email:holderEmail, name:holderName, amount:selType.price, eventTitle:event.title,
        onSuccess:async(ref)=>{setSubmitting(true);await issueTicket(ref);},
        onClose:()=>{setPayStep("form");notify("Payment cancelled","error"); } });
      } catch(e) { setPayStep("form"); notify(e.message,"error"); }
      return;
    }
    if (payProvider==="flutterwave") {
      setSubmitting(false); setPayStep("paying");
      try { await openFlutterwaveCheckout({ email:holderEmail, name:holderName, phone:holderPhone, amount:selType.price, eventTitle:event.title,
        onSuccess:async(txId)=>{setSubmitting(true);await issueTicket(String(txId));},
        onClose:()=>{setPayStep("form");notify("Payment cancelled","error"); } });
      } catch(e) { setPayStep("form"); notify(e.message,"error"); }
      return;
    }
    await issueTicket(null);
  };

  if (success) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{maxWidth:480,width:"100%",textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:T.success+"20",border:`2px solid ${T.success}`,
          display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px"}}>
          <CheckCircle size={36} style={{color:T.success}}/>
        </div>
        <h2 className="outfit" style={{fontSize:30,fontWeight:900,color:T.text,marginBottom:12}}>You're registered!</h2>
        <p style={{color:T.muted,marginBottom:12}}>
          {success.ticket?.paymentStatus==="paid"
            ? "Payment confirmed. Your ticket has been emailed to you."
            : success.ticket?.paymentStatus==="free"
            ? "Your free ticket has been emailed to you."
            : "Your ticket is pending payment confirmation."}
        </p>
        {success.ticket?.paymentRef && <p style={{fontSize:12,color:T.success,marginBottom:16}}>Payment ref: {success.ticket.paymentRef}</p>}
        <Card style={{padding:24,marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><QRDisplay value={success.code} size={180}/></div>
          <div style={{background:T.surface,borderRadius:10,padding:"10px 14px",textAlign:"left"}}>
            <p style={{fontSize:11,color:T.muted,marginBottom:4}}>Your ticket code (show at gate):</p>
            <code style={{fontSize:11,color:T.gold,wordBreak:"break-all"}}>{success.code}</code>
          </div>
          {success.ticket?.holderEmail && (
            <p style={{fontSize:12,color:T.muted,marginTop:10}}>
              <Mail size={11} style={{display:"inline",marginRight:4}}/>Emailed to {success.ticket.holderEmail}
            </p>
          )}
        </Card>
        <Btn full v="secondary" onClick={onBack}>Back to Events</Btn>
      </div>
    </div>
  );

  return (
    <div style={{background:T.bg,minHeight:"100vh",paddingTop:64}}>
      <div style={{height:260,background:EVENT_BANNERS[event.banner]||EVENT_BANNERS.music,
        position:"relative",display:"flex",alignItems:"flex-end",padding:"32px 24px"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,8,15,.85),transparent)"}}/>
        <div style={{position:"relative"}}>
          <Bdg color="purple">{event.category}</Bdg>
          <h1 className="outfit" style={{fontSize:mobile?24:36,fontWeight:900,color:"white",marginTop:8,lineHeight:1.2}}>{event.title}</h1>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:mobile?"24px 16px":"40px 24px"}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:13,marginBottom:28}}>
          <ChevronLeft size={15}/>Back to events
        </button>

        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 340px",gap:24,alignItems:"start"}}>
          {/* Left: info + form */}
          <div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
              <span style={{fontSize:13,color:T.muted}}><Calendar size={12} style={{display:"inline",marginRight:4}}/>{event.date} {event.time}–{event.endTime}</span>
              <span style={{fontSize:13,color:T.muted}}><MapPin size={12} style={{display:"inline",marginRight:4}}/>{event.venue}, {event.city}</span>
            </div>
            <p style={{fontSize:14,color:T.muted,lineHeight:1.8,marginBottom:28}}>{event.desc}</p>

            <Card style={{padding:28}}>
              <h3 style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:20}}>Registration Form</h3>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {event.regFields.map(f=>(
                  <Inp key={f.id} label={f.label} value={formData[f.id]||""} onChange={v=>setF(f.id,v)}
                    type={f.type==="select"?"text":f.type} placeholder={f.placeholder}
                    required={f.required} options={f.type==="select"?f.options?.map(o=>({value:o,label:o})):null}/>
                ))}
                {payStep==="paying" && (
                  <div style={{padding:20,borderRadius:14,background:T.accent+"15",border:`1px solid ${T.accent+"40"}`,textAlign:"center"}}>
                    <div className="spin" style={{width:28,height:28,border:`3px solid ${T.border}`,borderTopColor:T.accentL,borderRadius:"50%",margin:"0 auto 10px"}}/>
                    <p style={{fontSize:14,color:T.accentL,fontWeight:700}}>Complete payment in the popup…</p>
                    <p style={{fontSize:12,color:T.muted,marginTop:4}}>Do not close this page</p>
                  </div>
                )}
                {payStep!=="paying" && (
                  <Btn full sz="lg" onClick={submit} disabled={submitting}>
                    {submitting?"Processing…":
                     isFree?"Register Free":
                     window._evPayCfg?.provider==="bank"?`Register · Pay ₦${selType?.price?.toLocaleString()} via Bank Transfer`:
                     window._evPayCfg?.provider==="paystack"?`Pay ₦${selType?.price?.toLocaleString()} with Paystack`:
                     window._evPayCfg?.provider==="flutterwave"?`Pay ₦${selType?.price?.toLocaleString()} with Flutterwave`:
                     `Register · ₦${selType?.price?.toLocaleString()}`}
                  </Btn>
                )}
                {window._evPayCfg?.provider==="bank" && selType?.price>0 && (
                  <div style={{padding:12,borderRadius:10,background:T.gold+"10",border:`1px solid ${T.gold+"30"}`,fontSize:12,color:T.gold}}>
                    💳 Bank Transfer: Guaranty Trust Bank · 0123456789 · Evenova Events Ltd<br/>
                    Use your name as reference. Ticket issued after confirmation.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: ticket selector */}
          <div style={{position:mobile?"static":"sticky",top:80}}>
            <Card style={{padding:22,marginBottom:14}}>
              <h3 style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Choose Ticket Type</h3>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {Object.entries(event.ticketTypes).map(([tid,t])=>{
                  const sel=selTypeId===tid;
                  return (
                    <div key={tid} onClick={()=>setSelTypeId(tid)}
                      style={{padding:14,borderRadius:12,border:`2px solid ${sel?t.color:T.border}`,
                        background:sel?t.color+"12":"transparent",cursor:"pointer",transition:"all .2s"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontWeight:700,color:sel?t.color:T.text,fontSize:14}}>{t.name}</span>
                        <span style={{fontWeight:800,color:T.gold}}>₦{t.price.toLocaleString()}</span>
                      </div>
                      {t.perks?.map((p,i)=>(
                        <p key={i} style={{fontSize:12,color:T.muted}}><CheckCircle size={10} style={{display:"inline",marginRight:4,color:T.success}}/>{p}</p>
                      ))}
                      {sel && <p style={{fontSize:11,color:t.color,fontWeight:700,marginTop:6}}>✓ Selected</p>}
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card style={{padding:18}}>
              <p style={{fontSize:12,color:T.muted,fontWeight:700,marginBottom:10}}>Entry Gates</p>
              {Object.values(event.gates).map((g,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:g.color}}/>
                  <span style={{fontSize:13,color:T.text}}>{g.name}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   17. REGISTER  (organizer application)
───────────────────────────────────────────────────────────── */
