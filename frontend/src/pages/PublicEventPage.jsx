import { useState } from "react";
import { Calendar, CheckCircle, ChevronLeft, Info, Mail, MapPin, Upload } from "lucide-react";
import { EVENT_BANNERS, T, calcServiceCharge, calcTotalWithCharge, calcOrganizerEarning } from "../styles/theme.js";
import { Bdg, Btn, Card, Inp, QRDisplay } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";
import { genId, encodeTicket } from "../utils/crypto.js";
import { sendTicketEmail } from "../utils/email.js";
import { openPaystackCheckout, openFlutterwaveCheckout } from "../utils/payment.js";
import { api } from "../utils/api.js";

function CustomField({ field, value, onChange }) {
  const base = { width:"100%",padding:"10px 14px",borderRadius:10,fontSize:14,color:T.text,background:"var(--ev-surface)",border:"1px solid var(--ev-border)",fontFamily:"inherit",transition:"border .18s" };
  const label = <label style={{ fontSize:11,fontWeight:700,color:"var(--ev-muted)",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:6 }}>{field.label}{field.required&&<span style={{ color:"var(--ev-danger)",marginLeft:3 }}>*</span>}</label>;
  if (field.type==="checkbox") return <div>{label}<label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer" }}><div onClick={()=>onChange(!value)} style={{ width:20,height:20,borderRadius:6,border:`2px solid ${value?"var(--ev-accent)":"var(--ev-border)"}`,background:value?"var(--ev-accent)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>{value&&<CheckCircle size={12} color="white"/>}</div><span style={{ fontSize:13,color:T.text }}>{field.placeholder||field.label}</span></label></div>;
  if (field.type==="select"&&field.options?.length) return <div>{label}<select value={value||""} onChange={e=>onChange(e.target.value)} style={base}><option value="">— Select —</option>{field.options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>;
  if (field.type==="textarea") return <div>{label}<textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder} rows={3} style={{ ...base,resize:"vertical" }}/></div>;
  return <div>{label}<input type={field.type||"text"} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder} style={base}/></div>;
}

function TicketCard({ tid, ticket: t, selected, onSelect, feeMode }) {
  const fee = calcServiceCharge(t.price);
  const total = calcTotalWithCharge(t.price, feeMode);
  return (
    <div onClick={()=>onSelect(tid)} style={{ borderRadius:14,border:`2px solid ${selected?t.color:"var(--ev-border)"}`,background:selected?t.color+"12":"var(--ev-card)",cursor:"pointer",transition:"all .2s",overflow:"hidden" }}>
      {t.ticketImage && <div style={{ height:72,overflow:"hidden",position:"relative" }}><img src={t.ticketImage} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/><div style={{ position:"absolute",inset:0,background:`linear-gradient(to bottom,transparent,${selected?t.color+"40":"rgba(8,8,15,.6)"})` }}/></div>}
      <div style={{ padding:14 }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
          <span style={{ fontWeight:700,color:selected?t.color:T.text,fontSize:14 }}>{t.name}</span>
          <div style={{ textAlign:"right" }}>
            <span style={{ fontWeight:800,color:"var(--ev-gold)",fontSize:15 }}>{t.price===0?"Free":`₦${total.toLocaleString()}`}</span>
            {t.price>0&&feeMode!=="absorb"&&<p style={{ fontSize:10,color:"var(--ev-muted)",marginTop:1 }}>incl. ₦{fee.toLocaleString()} fee</p>}
          </div>
        </div>
        {t.perks?.map((p,i)=><p key={i} style={{ fontSize:12,color:"var(--ev-muted)" }}><CheckCircle size={10} style={{ display:"inline",marginRight:4,color:"var(--ev-success)" }}/>{p}</p>)}
        {selected&&<p style={{ fontSize:11,color:t.color,fontWeight:700,marginTop:6 }}>✓ Selected</p>}
      </div>
    </div>
  );
}

function PriceBreakdown({ price, feeMode }) {
  if (!price||price===0) return null;
  const fee = calcServiceCharge(price);
  const total = calcTotalWithCharge(price, feeMode);
  return (
    <div style={{ padding:"12px 14px",borderRadius:10,background:"var(--ev-surface)",border:"1px solid var(--ev-border)",marginBottom:12 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13 }}>
        <span style={{ color:"var(--ev-muted)" }}>Ticket price</span>
        <span style={{ color:T.text,fontWeight:600 }}>₦{price.toLocaleString()}</span>
      </div>
      {feeMode!=="absorb" && (
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:13,alignItems:"center" }}>
          <span style={{ display:"flex",alignItems:"center",gap:5,color:"var(--ev-muted)" }}>
            Platform fee (5%) <Info size={11} title="Keeps Evenova running"/>
          </span>
          <span style={{ color:"var(--ev-muted)" }}>₦{fee.toLocaleString()}</span>
        </div>
      )}
      <div style={{ height:1,background:"var(--ev-border)",marginBottom:8 }}/>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:15 }}>
        <span style={{ fontWeight:700,color:T.text }}>Total</span>
        <span style={{ fontWeight:800,color:"var(--ev-gold)" }}>₦{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function PublicEventPage({ event, onBack, onRegister, notify }) {
  const { mobile } = useMedia();
  const [selTypeId, setSelTypeId] = useState(Object.keys(event.ticketTypes)[1]||Object.keys(event.ticketTypes)[0]);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [payStep, setPayStep] = useState("form");
  const [success, setSuccess] = useState(null);
  const [receiptDataUrl, setReceiptDataUrl] = useState(null);
  const [receiptName, setReceiptName] = useState("");

  const selType = event.ticketTypes[selTypeId];
  const isFree = !selType?.price||selType.price===0;
  const setF = (id,v) => setFormData(f=>({...f,[id]:v}));
  const getPayCfg = () => event.paymentConfig||window._evPayCfg||{};

  const issueTicket = async (payRef, payStatus="free", provider=null) => {
    if (payStatus==="paid") {
      // Never trust the payment popup's onSuccess callback on its own — it
      // runs entirely in the browser and can be forged. Re-check the
      // reference against the provider's API server-side before issuing
      // anything.
      const expectedAmountKobo = Math.round(calcTotalWithCharge(selType?.price||0, event.feeMode) * 100);
      let verification;
      try {
        verification = await api.verifyPayment(payRef, provider, expectedAmountKobo);
      } catch (e) {
        setSubmitting(false); setPayStep("form");
        notify("Couldn't verify your payment: " + (e.message||"please try again."), "error");
        return;
      }
      if (!verification?.verified) {
        setSubmitting(false); setPayStep("form");
        notify(verification?.reason || "Payment could not be verified — please try again.", "error");
        return;
      }
    }
    const tId=genId("TKT"),uId=genId("USR");
    const holderName=formData[event.regFields[0]?.id]||"Attendee";
    const holderEmail=formData[event.regFields[1]?.id]||"";
    const holderPhone=formData[event.regFields[2]?.id]||"";
    const ticket = {
      id:tId,evId:event.id,uId,gId:Object.keys(event.gates)[0],tpId:selTypeId,
      code:encodeTicket(event.id,tId,uId),holderName,holderEmail,holderPhone,
      status:payStatus==="pending"?"pending_payment":"unused",
      customData:formData,registeredAt:new Date().toISOString(),
      paymentRef:payRef||null,paymentStatus:payStatus,receiptUrl:receiptDataUrl||null,
      ticketPrice:selType?.price||0,
      feeMode:event.feeMode||"pass_through",
      platformFee:calcServiceCharge(selType?.price||0),
      totalPaid:calcTotalWithCharge(selType?.price||0, event.feeMode),
      organizerEarning:calcOrganizerEarning(selType?.price||0, event.feeMode),
    };
    const reg = { id:genId("REG"),tId,uId,evId:event.id,typeId:selTypeId,data:formData,holderName,holderEmail,code:ticket.code };
    onRegister(event.id,reg,ticket);
    if (holderEmail&&payStatus!=="pending") await sendTicketEmail(ticket,event,selType,notify);
    setSuccess({...reg,ticket});
    setSubmitting(false);
    setPayStep("done");
  };

  const submit = async () => {
    const missing = event.regFields.filter(f=>f.required&&!formData[f.id]);
    if (missing.length) { notify("Fill required: "+missing.map(f=>f.label).join(", "),"error"); return; }
    setSubmitting(true);
    const cfg = getPayCfg();
    const payProvider = cfg.provider||"none";
    if (isFree||payProvider==="none") { await issueTicket(null,"free"); return; }
    const holderEmail=formData[event.regFields[1]?.id]||"";
    const holderName=formData[event.regFields[0]?.id]||"Attendee";
    const holderPhone=formData[event.regFields[2]?.id]||"";
    const chargeAmount = calcTotalWithCharge(selType.price, event.feeMode);
    if (payProvider==="paystack") {
      setSubmitting(false); setPayStep("paying");
      try { await openPaystackCheckout({ email:holderEmail,name:holderName,amount:chargeAmount,eventTitle:event.title,onSuccess:async(ref)=>{setSubmitting(true);await issueTicket(ref,"paid","paystack")},onClose:()=>{setPayStep("form");notify("Payment cancelled","error")} }); }
      catch(e) { setPayStep("form");notify(e.message,"error"); }
      return;
    }
    if (payProvider==="flutterwave") {
      setSubmitting(false); setPayStep("paying");
      try { await openFlutterwaveCheckout({ email:holderEmail,name:holderName,phone:holderPhone,amount:chargeAmount,eventTitle:event.title,onSuccess:async(txId)=>{setSubmitting(true);await issueTicket(String(txId),"paid","flutterwave")},onClose:()=>{setPayStep("form");notify("Payment cancelled","error")} }); }
      catch(e) { setPayStep("form");notify(e.message,"error"); }
      return;
    }
    if (payProvider==="bank") { setSubmitting(false); setPayStep("bank-receipt"); return; }
    await issueTicket(null,"free");
  };

  if (success) {
    const tp=event.ticketTypes[success.ticket?.tpId];
    const isPending=success.ticket?.paymentStatus==="pending";
    return (
      <div style={{ minHeight:"100vh",background:"var(--ev-bg)",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
        <div style={{ maxWidth:480,width:"100%",textAlign:"center" }} className="fade-up">
          <div style={{ width:80,height:80,borderRadius:"50%",background:(isPending?"var(--ev-gold)":"var(--ev-success)")+"20",border:`2px solid ${isPending?"var(--ev-gold)":"var(--ev-success)"}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px" }}>
            {isPending?<span style={{ fontSize:36 }}>⏳</span>:<CheckCircle size={36} color="var(--ev-success)"/>}
          </div>
          <h2 className="outfit" style={{ fontSize:30,fontWeight:900,color:T.text,marginBottom:10 }}>{isPending?"Receipt Submitted!":"You're in! 🎉"}</h2>
          <p style={{ color:"var(--ev-muted)",marginBottom:20,lineHeight:1.6 }}>
            {isPending?"We've received your receipt. Your ticket will be emailed once payment is confirmed.":success.ticket?.paymentStatus==="paid"?"Payment confirmed. Your ticket has been emailed to you.":"Your free ticket has been emailed to you."}
          </p>
          {!isPending&&(()=>{
            const bgImg = tp?.ticketImage || event.coverImage || "";
            return (
            <div className="glass-card" style={{ padding:0,marginBottom:20,overflow:"hidden",textAlign:"left",borderRadius:20,position:"relative" }}>
              <div style={{
                minHeight:180, position:"relative", padding:22, boxSizing:"border-box",
                display:"flex", flexDirection:"column", justifyContent:"flex-end",
                ...(bgImg
                  ? { backgroundImage:`url(${bgImg})`, backgroundSize:"cover", backgroundPosition:"center" }
                  : { background:"linear-gradient(135deg,#7c3aed,#a855f7)" }),
              }}>
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(15,8,30,.15), rgba(10,5,20,.9))" }}/>
                <div style={{ position:"relative", color:"#fff" }}>
                  <p style={{ fontSize:11,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",opacity:.75,margin:"0 0 6px" }}>Evenova · Admit One</p>
                  <p style={{ fontSize:20,fontWeight:800,margin:"0 0 4px",lineHeight:1.25 }}>{event.title}</p>
                  <p style={{ fontSize:13,opacity:.85,margin:0 }}>{tp?.name || "General"} · {success.ticket?.holderName || "Attendee"}</p>
                </div>
              </div>
              <div style={{ position:"relative", height:0 }}>
                <div style={{ position:"absolute",top:-11,left:-11,width:22,height:22,borderRadius:"50%",background:"var(--ev-bg)" }}/>
                <div style={{ position:"absolute",top:-11,right:-11,width:22,height:22,borderRadius:"50%",background:"var(--ev-bg)" }}/>
              </div>
              <div style={{ borderTop:"2px dashed var(--ev-border, rgba(255,255,255,.15))", margin:"0 22px" }}/>
              <div style={{ padding:20 }}>
                <div style={{ display:"flex",justifyContent:"center",marginBottom:16 }}><QRDisplay value={success.code} size={180}/></div>
                <div style={{ background:"var(--ev-surface)",borderRadius:10,padding:"10px 14px",marginBottom:12 }}>
                  <p style={{ fontSize:11,color:"var(--ev-muted)",marginBottom:4 }}>Show this QR at the gate:</p>
                  <code style={{ fontSize:10,color:"var(--ev-gold)",wordBreak:"break-all" }}>{success.code}</code>
                </div>
                {success.ticket?.totalPaid>0&&<div style={{ padding:"8px 12px",borderRadius:8,background:"var(--ev-success)10",border:"1px solid var(--ev-success)30",display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8 }}><span style={{ color:"var(--ev-muted)" }}>Total paid</span><span style={{ color:"var(--ev-success)",fontWeight:700 }}>₦{success.ticket.totalPaid.toLocaleString()}</span></div>}
                {success.ticket?.holderEmail&&<p style={{ fontSize:12,color:"var(--ev-muted)",marginTop:8,textAlign:"center" }}><Mail size={11} style={{ display:"inline",marginRight:4 }}/>Emailed to {success.ticket.holderEmail}</p>}
              </div>
            </div>
            );
          })()}
          <Btn full v="secondary" onClick={onBack}>Back to Events</Btn>
        </div>
      </div>
    );
  }

  const bannerBg = event.coverImage ? {} : { background:EVENT_BANNERS[event.banner]||EVENT_BANNERS.default };
  return (
    <div style={{ background:"var(--ev-bg)",minHeight:"100vh",paddingTop:64 }}>
      <div style={{ height:280,position:"relative",display:"flex",alignItems:"flex-end",padding:"32px 24px",overflow:"hidden",...bannerBg }}>
        {event.coverImage&&<img src={event.coverImage} alt={event.title} style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }}/>}
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,8,15,.92),rgba(8,8,15,.25))" }}/>
        <div style={{ position:"relative" }}>
          <Bdg color="purple">{event.category}</Bdg>
          <h1 className="outfit" style={{ fontSize:mobile?24:38,fontWeight:900,color:"white",marginTop:8,lineHeight:1.1 }}>{event.title}</h1>
        </div>
      </div>
      <div style={{ maxWidth:900,margin:"0 auto",padding:mobile?"24px 16px":"40px 24px" }}>
        <button onClick={onBack} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--ev-muted)",cursor:"pointer",fontSize:13,marginBottom:28 }}>
          <ChevronLeft size={15}/>Back to events
        </button>
        <div style={{ display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 340px",gap:24,alignItems:"start" }}>
          <div>
            <div style={{ display:"flex",gap:16,flexWrap:"wrap",marginBottom:20 }}>
              <span style={{ fontSize:13,color:"var(--ev-muted)" }}><Calendar size={12} style={{ display:"inline",marginRight:4 }}/>{event.date} · {event.time}–{event.endTime}</span>
              <span style={{ fontSize:13,color:"var(--ev-muted)" }}><MapPin size={12} style={{ display:"inline",marginRight:4 }}/>{event.venue}, {event.city}</span>
            </div>
            <p style={{ fontSize:14,color:"var(--ev-muted)",lineHeight:1.8,marginBottom:28 }}>{event.desc}</p>
            <Card style={{ padding:28 }}>
              <h3 style={{ fontSize:16,fontWeight:700,color:T.text,marginBottom:4 }}>Registration Form</h3>
              <p style={{ fontSize:13,color:"var(--ev-muted)",marginBottom:20 }}>Fill in your details to secure your spot.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                {payStep!=="bank-receipt"&&event.regFields.map(f=><CustomField key={f.id} field={f} value={formData[f.id]} onChange={v=>setF(f.id,v)}/>)}
                {payStep==="paying"&&(
                  <div style={{ padding:20,borderRadius:14,background:"var(--ev-accent)15",border:"1px solid var(--ev-accent)40",textAlign:"center" }}>
                    <div className="spin" style={{ width:28,height:28,border:"3px solid var(--ev-border)",borderTopColor:"var(--ev-accentL)",borderRadius:"50%",margin:"0 auto 10px" }}/>
                    <p style={{ fontSize:14,color:"var(--ev-accentL)",fontWeight:700 }}>Complete payment in the popup…</p>
                    <p style={{ fontSize:12,color:"var(--ev-muted)",marginTop:4 }}>Do not close this page</p>
                  </div>
                )}
                {payStep==="bank-receipt"&&(()=>{
                  const cfg=getPayCfg();
                  const total=calcTotalWithCharge(selType?.price||0, event.feeMode);
                  return (
                    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                      <div style={{ padding:16,borderRadius:14,background:"var(--ev-gold)12",border:"1px solid var(--ev-gold)40" }}>
                        <p style={{ fontSize:13,fontWeight:700,color:"var(--ev-gold)",marginBottom:10 }}>💳 Transfer to this account:</p>
                        <div style={{ display:"grid",gap:8 }}>
                          {[["Bank",cfg.bankName],["Account No.",cfg.bankAccount],["Account Name",cfg.bankHolder],[event.feeMode==="absorb"?"Amount":"Amount (incl. 5% fee)",`₦${total.toLocaleString()}`]].map(([k,v])=>(
                            <div key={k} style={{ display:"flex",justifyContent:"space-between",fontSize:13 }}>
                              <span style={{ color:"var(--ev-muted)" }}>{k}</span>
                              <span style={{ color:T.text,fontWeight:700 }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize:11,fontWeight:700,color:"var(--ev-muted)",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:8 }}>Upload Transfer Receipt <span style={{ color:"var(--ev-danger)" }}>*</span></label>
                        {!receiptDataUrl?(
                          <label style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,padding:28,borderRadius:12,border:"2px dashed var(--ev-border)",cursor:"pointer",background:"var(--ev-surface)" }}
                            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--ev-accent)"}
                            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--ev-border)"}>
                            <Upload size={24} color="var(--ev-muted)"/>
                            <span style={{ fontSize:13,color:"var(--ev-muted)" }}>Click to upload screenshot or PDF</span>
                            <input type="file" accept="image/*,application/pdf" style={{ display:"none" }} onChange={e=>{const file=e.target.files[0];if(!file)return;if(file.size>5*1024*1024){notify("File must be under 5 MB","error");return;}setReceiptName(file.name);const r=new FileReader();r.onload=ev=>setReceiptDataUrl(ev.target.result);r.readAsDataURL(file);}}/>
                          </label>
                        ):(
                          <div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:12,background:"var(--ev-success)12",border:"1px solid var(--ev-success)40" }}>
                            <CheckCircle size={16} color="var(--ev-success)"/>
                            <span style={{ fontSize:13,color:"var(--ev-success)",flex:1 }}>{receiptName}</span>
                            <button onClick={()=>{setReceiptDataUrl(null);setReceiptName("");}} style={{ background:"none",border:"none",color:"var(--ev-muted)",cursor:"pointer" }}>✕</button>
                          </div>
                        )}
                      </div>
                      <Btn full sz="lg" disabled={!receiptDataUrl||submitting} onClick={async()=>{setSubmitting(true);await issueTicket("BANK_PENDING","pending");}}>
                        {submitting?"Submitting…":"Submit Receipt & Wait for Confirmation"}
                      </Btn>
                      <button onClick={()=>{setPayStep("form");setReceiptDataUrl(null);setReceiptName("");}} style={{ background:"none",border:"none",color:"var(--ev-muted)",fontSize:12,cursor:"pointer",textAlign:"center",marginTop:-4 }}>← Back to form</button>
                    </div>
                  );
                })()}
                {payStep!=="paying"&&payStep!=="bank-receipt"&&(()=>{
                  const cfg=getPayCfg();
                  const total=calcTotalWithCharge(selType?.price||0, event.feeMode);
                  const btnLabel=submitting?"Processing…":isFree?"Register Free":cfg.provider==="paystack"?`Pay ₦${total.toLocaleString()} with Paystack`:cfg.provider==="flutterwave"?`Pay ₦${total.toLocaleString()} with Flutterwave`:cfg.provider==="bank"?`Register · Pay ₦${total.toLocaleString()} via Transfer`:`Register · ₦${total.toLocaleString()}`;
                  return (
                    <div>
                      {!isFree&&<PriceBreakdown price={selType?.price||0} feeMode={event.feeMode}/>}
                      <Btn full sz="lg" onClick={submit} disabled={submitting} style={{ marginTop:4 }}>{btnLabel}</Btn>
                    </div>
                  );
                })()}
              </div>
            </Card>
          </div>
          <div style={{ position:mobile?"static":"sticky",top:80 }}>
            <Card style={{ padding:22,marginBottom:14 }}>
              <h3 style={{ fontSize:14,fontWeight:700,color:T.text,marginBottom:14 }}>Choose Ticket Type</h3>
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {Object.entries(event.ticketTypes).map(([tid,t])=><TicketCard key={tid} tid={tid} ticket={t} selected={selTypeId===tid} onSelect={setSelTypeId} feeMode={event.feeMode}/>)}
              </div>
            </Card>
            <Card style={{ padding:18 }}>
              <p style={{ fontSize:12,color:"var(--ev-muted)",fontWeight:700,marginBottom:10 }}>Entry Gates</p>
              {Object.values(event.gates).map((g,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:g.color }}/>
                  <span style={{ fontSize:13,color:T.text }}>{g.name}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}