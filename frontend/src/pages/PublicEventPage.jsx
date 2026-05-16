import { useState } from "react";
import { Calendar, CheckCircle, ChevronLeft, Mail, MapPin, Ticket, Upload } from "lucide-react";
import { EVENT_BANNERS, T } from "../styles/theme.js";
import { Bdg, Btn, Card, Inp, QRDisplay } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";
import { genId, encodeTicket } from "../utils/crypto.js";
import { sendTicketEmail } from "../utils/email.js";
import { openPaystackCheckout, openFlutterwaveCheckout } from "../utils/payment.js";

/* ── Custom field renderer ─────────────────────────────────── */
function CustomField({ field, value, onChange }) {
  const base = { width:"100%", padding:"10px 14px", borderRadius:10, fontSize:14,
    color:T.text, background:T.surface, border:`1px solid ${T.border}`, fontFamily:"inherit" };
  const label = (
    <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase",
      letterSpacing:".06em", display:"block", marginBottom:6 }}>
      {field.label}{field.required && <span style={{ color:T.danger, marginLeft:3 }}>*</span>}
    </label>
  );

  if (field.type === "checkbox") return (
    <div>
      {label}
      <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
        <div onClick={() => onChange(!value)}
          style={{ width:20, height:20, borderRadius:6, border:`2px solid ${value ? T.accent : T.border}`,
            background: value ? T.accent : "transparent", display:"flex", alignItems:"center",
            justifyContent:"center", transition:"all .15s", flexShrink:0, cursor:"pointer" }}>
          {value && <CheckCircle size={12} color="white"/>}
        </div>
        <span style={{ fontSize:13, color:T.text }}>{field.placeholder || field.label}</span>
      </label>
    </div>
  );

  if (field.type === "date") return (
    <div>
      {label}
      <input type="date" value={value || ""} onChange={e => onChange(e.target.value)}
        style={{ ...base, colorScheme:"dark" }}/>
    </div>
  );

  if (field.type === "select" && field.options?.length) return (
    <div>
      {label}
      <select value={value || ""} onChange={e => onChange(e.target.value)} style={base}>
        <option value="">— Select —</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  if (field.type === "textarea") return (
    <div>
      {label}
      <textarea value={value || ""} onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder} rows={3} style={{ ...base, resize:"vertical" }}/>
    </div>
  );

  return (
    <div>
      {label}
      <input type={field.type || "text"} value={value || ""} onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder} style={base}/>
    </div>
  );
}

/* ── Ticket card ───────────────────────────────────────────── */
function TicketCard({ tid, ticket: t, selected, onSelect }) {
  return (
    <div onClick={() => onSelect(tid)}
      style={{ borderRadius:14, border:`2px solid ${selected ? t.color : T.border}`,
        background: selected ? t.color+"12" : "transparent", cursor:"pointer",
        transition:"all .2s", overflow:"hidden" }}>
      {t.ticketImage && (
        <div style={{ height:72, overflow:"hidden", position:"relative" }}>
          <img src={t.ticketImage} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom,transparent,${selected?t.color+"40":"rgba(8,8,15,.6)"})` }}/>
        </div>
      )}
      <div style={{ padding:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontWeight:700, color: selected ? t.color : T.text, fontSize:14 }}>{t.name}</span>
          <span style={{ fontWeight:800, color:T.gold }}>
            {t.price === 0 ? "Free" : `₦${t.price.toLocaleString()}`}
          </span>
        </div>
        {t.perks?.map((p,i) => (
          <p key={i} style={{ fontSize:12, color:T.muted }}>
            <CheckCircle size={10} style={{ display:"inline", marginRight:4, color:T.success }}/>{p}
          </p>
        ))}
        {selected && <p style={{ fontSize:11, color:t.color, fontWeight:700, marginTop:6 }}>✓ Selected</p>}
      </div>
    </div>
  );
}

export default function PublicEventPage({ event, onBack, onRegister, notify }) {
  const { mobile } = useMedia();
  const [selTypeId, setSelTypeId] = useState(Object.keys(event.ticketTypes)[1]||Object.keys(event.ticketTypes)[0]);
  const [formData, setFormData]   = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [payStep, setPayStep]     = useState("form"); // form | paying | bank-receipt | done
  const [success, setSuccess]     = useState(null);
  const [receiptDataUrl, setReceiptDataUrl] = useState(null);
  const [receiptName, setReceiptName]       = useState("");

  const selType = event.ticketTypes[selTypeId];
  const isFree  = !selType?.price || selType.price === 0;
  const setF    = (id, v) => setFormData(f => ({ ...f, [id]: v }));

  // Read payment config — org-level config is stored on the event's org, exposed via window._evPayCfg
  const getPayCfg = () => event.paymentConfig || window._evPayCfg || {};

  const issueTicket = async (payRef, payStatus = "free") => {
    const tId = genId("TKT"), uId = genId("USR");
    const holderName  = formData[event.regFields[0]?.id] || "Attendee";
    const holderEmail = formData[event.regFields[1]?.id] || "";
    const holderPhone = formData[event.regFields[2]?.id] || "";
    const ticket = {
      id: tId, evId: event.id, uId,
      gId: Object.keys(event.gates)[0], tpId: selTypeId,
      code: encodeTicket(event.id, tId, uId),
      holderName, holderEmail, holderPhone,
      status: payStatus === "pending" ? "pending_payment" : "unused",
      customData: formData,
      registeredAt: new Date().toISOString(),
      paymentRef: payRef || null,
      paymentStatus: payStatus,
      receiptUrl: receiptDataUrl || null,
    };
    const reg = {
      id: genId("REG"), tId, uId, evId: event.id,
      typeId: selTypeId, data: formData,
      holderName, holderEmail, code: ticket.code,
    };
    onRegister(event.id, reg, ticket);
    // Only email if ticket is confirmed (not pending manual approval)
    if (holderEmail && payStatus !== "pending") {
      await sendTicketEmail(ticket, event, selType, notify);
    }
    setSuccess({ ...reg, ticket });
    setSubmitting(false);
    setPayStep("done");
  };

  const submit = async () => {
    const missing = event.regFields.filter(f => f.required && !formData[f.id]);
    if (missing.length) { notify("Fill required: " + missing.map(f => f.label).join(", "), "error"); return; }
    setSubmitting(true);

    const cfg = getPayCfg();
    const payProvider = cfg.provider || "none";

    if (isFree || payProvider === "none") {
      await issueTicket(null, "free");
      return;
    }

    const holderEmail = formData[event.regFields[1]?.id] || "";
    const holderName  = formData[event.regFields[0]?.id] || "Attendee";
    const holderPhone = formData[event.regFields[2]?.id] || "";

    if (payProvider === "paystack") {
      setSubmitting(false); setPayStep("paying");
      try {
        await openPaystackCheckout({
          email: holderEmail, name: holderName, amount: selType.price, eventTitle: event.title,
          onSuccess: async (ref) => { setSubmitting(true); await issueTicket(ref, "paid"); },
          onClose: () => { setPayStep("form"); notify("Payment cancelled", "error"); },
        });
      } catch(e) { setPayStep("form"); notify(e.message, "error"); }
      return;
    }

    if (payProvider === "flutterwave") {
      setSubmitting(false); setPayStep("paying");
      try {
        await openFlutterwaveCheckout({
          email: holderEmail, name: holderName, phone: holderPhone, amount: selType.price, eventTitle: event.title,
          onSuccess: async (txId) => { setSubmitting(true); await issueTicket(String(txId), "paid"); },
          onClose: () => { setPayStep("form"); notify("Payment cancelled", "error"); },
        });
      } catch(e) { setPayStep("form"); notify(e.message, "error"); }
      return;
    }

    if (payProvider === "bank") {
      // Don't issue ticket yet — collect receipt first
      setSubmitting(false);
      setPayStep("bank-receipt");
      return;
    }

    await issueTicket(null, "free");
  };

  /* ── Success screen ─────────────────────────────────────── */
  if (success) {
    const tp = event.ticketTypes[success.ticket?.tpId];
    const isPending = success.ticket?.paymentStatus === "pending";
    return (
      <div style={{ minHeight:"100vh", background:"#08080f", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ maxWidth:480, width:"100%", textAlign:"center" }} className="fade-up">
          <div style={{ width:80, height:80, borderRadius:"50%", background:(isPending?T.gold:T.success)+"20",
            border:`2px solid ${isPending?T.gold:T.success}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
            {isPending
              ? <span style={{ fontSize:36 }}>⏳</span>
              : <CheckCircle size={36} color={T.success}/>}
          </div>
          <h2 className="outfit" style={{ fontSize:30, fontWeight:900, color:T.text, marginBottom:10 }}>
            {isPending ? "Receipt Submitted!" : "You're in! 🎉"}
          </h2>
          <p style={{ color:T.muted, marginBottom:20, lineHeight:1.6 }}>
            {isPending
              ? "We've received your receipt. Your ticket will be emailed once we confirm your payment — usually within a few hours."
              : success.ticket?.paymentStatus === "paid"
              ? "Payment confirmed. Your ticket has been emailed to you."
              : "Your free ticket has been emailed to you."}
          </p>

          {/* Only show QR if ticket is confirmed */}
          {!isPending && (
            <div className="glass-card" style={{ padding:0, marginBottom:20, overflow:"hidden", textAlign:"left" }}>
              {tp?.ticketImage && (
                <div style={{ height:120, overflow:"hidden", position:"relative" }}>
                  <img src={tp.ticketImage} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 40%,rgba(8,8,15,.9))" }}/>
                  <div style={{ position:"absolute", bottom:12, left:20 }}>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,.6)", textTransform:"uppercase", letterSpacing:".1em" }}>{event.title}</p>
                    <p style={{ fontSize:18, fontWeight:800, color:"white" }}>{tp?.name}</p>
                  </div>
                </div>
              )}
              {!tp?.ticketImage && (
                <div style={{ padding:"20px 20px 0", background:`linear-gradient(135deg,${tp?.color||T.accent}18,transparent)` }}>
                  <p style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:".1em" }}>{event.title}</p>
                  <p style={{ fontSize:18, fontWeight:800, color:tp?.color||T.accent }}>{tp?.name}</p>
                </div>
              )}
              <div style={{ padding:20 }}>
                <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
                  <QRDisplay value={success.code} size={180}/>
                </div>
                <div style={{ background:T.surface, borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
                  <p style={{ fontSize:11, color:T.muted, marginBottom:4 }}>Show this QR at the gate:</p>
                  <code style={{ fontSize:10, color:T.gold, wordBreak:"break-all" }}>{success.code}</code>
                </div>
                {success.ticket?.holderName && (
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                    <span style={{ color:T.muted }}>Name</span>
                    <span style={{ color:T.text, fontWeight:600 }}>{success.ticket.holderName}</span>
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:6 }}>
                  <span style={{ color:T.muted }}>{event.date}</span>
                  <span style={{ color:T.muted }}>{event.venue}</span>
                </div>
                {success.ticket?.holderEmail && (
                  <p style={{ fontSize:12, color:T.muted, marginTop:10, textAlign:"center" }}>
                    <Mail size={11} style={{ display:"inline", marginRight:4 }}/>Emailed to {success.ticket.holderEmail}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Pending state — show what they submitted */}
          {isPending && success.ticket?.holderEmail && (
            <div style={{ padding:16, borderRadius:14, background:T.gold+"10", border:`1px solid ${T.gold+"30"}`, marginBottom:20, textAlign:"left" }}>
              <p style={{ fontSize:13, color:T.gold, fontWeight:700, marginBottom:6 }}>What happens next?</p>
              <p style={{ fontSize:13, color:T.muted, lineHeight:1.7 }}>
                We'll review your receipt and email your ticket to <strong style={{ color:T.text }}>{success.ticket.holderEmail}</strong> once confirmed.
              </p>
            </div>
          )}

          <Btn full v="secondary" onClick={onBack}>Back to Events</Btn>
        </div>
      </div>
    );
  }

  /* ── Event page ─────────────────────────────────────────── */
  return (
    <div style={{ background:"#08080f", minHeight:"100vh", paddingTop:64 }}>
      {/* Hero banner */}
      <div style={{ height:260, background:EVENT_BANNERS[event.banner]||EVENT_BANNERS[0],
        position:"relative", display:"flex", alignItems:"flex-end", padding:"32px 24px" }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(8,8,15,.9),transparent)" }}/>
        <div style={{ position:"relative" }}>
          <Bdg color="purple">{event.category}</Bdg>
          <h1 className="outfit" style={{ fontSize:mobile?24:38, fontWeight:900, color:"white", marginTop:8, lineHeight:1.1 }}>{event.title}</h1>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:mobile?"24px 16px":"40px 24px" }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:13, marginBottom:28 }}>
          <ChevronLeft size={15}/>Back to events
        </button>

        <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 340px", gap:24, alignItems:"start" }}>
          {/* Left: info + form */}
          <div>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:20 }}>
              <span style={{ fontSize:13, color:T.muted }}><Calendar size={12} style={{ display:"inline", marginRight:4 }}/>{event.date} · {event.time}–{event.endTime}</span>
              <span style={{ fontSize:13, color:T.muted }}><MapPin size={12} style={{ display:"inline", marginRight:4 }}/>{event.venue}, {event.city}</span>
            </div>
            <p style={{ fontSize:14, color:T.muted, lineHeight:1.8, marginBottom:28 }}>{event.desc}</p>

            {/* Registration form */}
            <Card style={{ padding:28 }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:4 }}>Registration Form</h3>
              <p style={{ fontSize:13, color:T.muted, marginBottom:20 }}>Fill in your details to secure your spot.</p>

              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {/* Always show fields unless we're on the bank-receipt step */}
                {payStep !== "bank-receipt" && event.regFields.map(f => (
                  <CustomField key={f.id} field={f} value={formData[f.id]} onChange={v => setF(f.id, v)}/>
                ))}

                {/* Paystack/Flutterwave processing spinner */}
                {payStep === "paying" && (
                  <div style={{ padding:20, borderRadius:14, background:T.accent+"15", border:`1px solid ${T.accent+"40"}`, textAlign:"center" }}>
                    <div className="spin" style={{ width:28, height:28, border:`3px solid ${T.border}`, borderTopColor:T.accentL, borderRadius:"50%", margin:"0 auto 10px" }}/>
                    <p style={{ fontSize:14, color:T.accentL, fontWeight:700 }}>Complete payment in the popup…</p>
                    <p style={{ fontSize:12, color:T.muted, marginTop:4 }}>Do not close this page</p>
                  </div>
                )}

                {/* ── Bank transfer + receipt upload step ── */}
                {payStep === "bank-receipt" && (() => {
                  const cfg = getPayCfg();
                  return (
                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      {/* Bank details box */}
                      <div style={{ padding:16, borderRadius:14, background:T.gold+"12", border:`1px solid ${T.gold+"40"}` }}>
                        <p style={{ fontSize:13, fontWeight:700, color:T.gold, marginBottom:10 }}>💳 Transfer to this account:</p>
                        <div style={{ display:"grid", gap:8 }}>
                          {[
                            ["Bank",         cfg.bankName],
                            ["Account No.",  cfg.bankAccount],
                            ["Account Name", cfg.bankHolder],
                            ["Amount",       `₦${selType?.price?.toLocaleString()}`],
                          ].map(([k, v]) => (
                            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                              <span style={{ color:T.muted }}>{k}</span>
                              <span style={{ color:T.text, fontWeight:700, fontFamily: k === "Account No." ? "monospace" : "inherit" }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        <p style={{ fontSize:11, color:T.muted, marginTop:10 }}>
                          Use your name as the payment reference / description.
                        </p>
                      </div>

                      {/* Receipt upload */}
                      <div>
                        <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:8 }}>
                          Upload Transfer Receipt <span style={{ color:T.danger }}>*</span>
                        </label>
                        {!receiptDataUrl ? (
                          <label
                            style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8,
                              padding:28, borderRadius:12, border:`2px dashed ${T.border}`, cursor:"pointer",
                              background:T.surface, transition:"border-color .15s" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
                            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                            <Upload size={24} color={T.muted}/>
                            <span style={{ fontSize:13, color:T.muted, textAlign:"center" }}>
                              Click to upload screenshot or PDF of your receipt
                            </span>
                            <span style={{ fontSize:11, color:T.muted }}>Max 5 MB · JPG, PNG, PDF</span>
                            <input type="file" accept="image/*,application/pdf" style={{ display:"none" }}
                              onChange={e => {
                                const file = e.target.files[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) { notify("File must be under 5 MB", "error"); return; }
                                setReceiptName(file.name);
                                const reader = new FileReader();
                                reader.onload = ev => setReceiptDataUrl(ev.target.result);
                                reader.readAsDataURL(file);
                              }}/>
                          </label>
                        ) : (
                          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12,
                            background:T.success+"12", border:`1px solid ${T.success+"40"}` }}>
                            <CheckCircle size={16} color={T.success}/>
                            <span style={{ fontSize:13, color:T.success, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{receiptName}</span>
                            <button onClick={() => { setReceiptDataUrl(null); setReceiptName(""); }}
                              style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:16, lineHeight:1 }}>✕</button>
                          </div>
                        )}
                      </div>

                      <Btn full sz="lg" disabled={!receiptDataUrl || submitting} onClick={async () => {
                        setSubmitting(true);
                        await issueTicket("BANK_PENDING", "pending");
                      }}>
                        {submitting ? "Submitting…" : "Submit Receipt & Wait for Confirmation"}
                      </Btn>
                      <button onClick={() => { setPayStep("form"); setReceiptDataUrl(null); setReceiptName(""); }}
                        style={{ background:"none", border:"none", color:T.muted, fontSize:12, cursor:"pointer", textAlign:"center", marginTop:-4 }}>
                        ← Back to form
                      </button>
                    </div>
                  );
                })()}

                {/* Normal submit button */}
                {payStep !== "paying" && payStep !== "bank-receipt" && (() => {
                  const cfg = getPayCfg();
                  const btnLabel = submitting ? "Processing…"
                    : isFree ? "Register Free"
                    : cfg.provider === "paystack"    ? `Pay ₦${selType?.price?.toLocaleString()} with Paystack`
                    : cfg.provider === "flutterwave" ? `Pay ₦${selType?.price?.toLocaleString()} with Flutterwave`
                    : cfg.provider === "bank"        ? `Register · Pay ₦${selType?.price?.toLocaleString()} via Transfer`
                    : `Register · ₦${selType?.price?.toLocaleString()}`;
                  return (
                    <Btn full sz="lg" onClick={submit} disabled={submitting} style={{ marginTop:4 }}>
                      {btnLabel}
                    </Btn>
                  );
                })()}
              </div>
            </Card>
          </div>

          {/* Right: ticket selector */}
          <div style={{ position:mobile?"static":"sticky", top:80 }}>
            <Card style={{ padding:22, marginBottom:14 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>Choose Ticket Type</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(event.ticketTypes).map(([tid, t]) => (
                  <TicketCard key={tid} tid={tid} ticket={t} selected={selTypeId===tid} onSelect={setSelTypeId}/>
                ))}
              </div>
            </Card>
            <Card style={{ padding:18 }}>
              <p style={{ fontSize:12, color:T.muted, fontWeight:700, marginBottom:10 }}>Entry Gates</p>
              {Object.values(event.gates).map((g,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:g.color }}/>
                  <span style={{ fontSize:13, color:T.text }}>{g.name}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}