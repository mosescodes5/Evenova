import { useMemo, useState } from "react";
import { Activity, CheckCircle, ChevronLeft, Clock, Copy, Download, Eye, Globe, Phone, Plus, QrCode, Scan, Search, Send, Ticket, TrendingUp, X } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Bdg, Btn, Card, Inp, Modal, QRDisplay, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { genId, encodeTicket, verifyQR } from "../../utils/crypto.js";
import { exportAttendees, exportScanLog } from "../../utils/export.js";
import { sendEmail, sendTicketEmail } from "../../utils/email.js";

function ManualTicketModal({ open, onClose, event, onIssue, notify }) {
  const [form, setForm] = useState({ name:"", email:"", phone:"", typeId:Object.keys(event?.ticketTypes||{})[0]||"", payMethod:"Bank Transfer", payRef:"", notes:"" });
  const [sending, setSending] = useState(false);
  const set = k => v => setForm(f=>({...f,[k]:v}));

  if (!event) return null;

  const submit = async () => {
    if (!form.name.trim()) { notify("Name is required","error"); return; }
    setSending(true);
    const tId=genId("TKT"), uId=genId("USR");
    const ticket = {
      id:tId, evId:event.id, uId, gId:Object.keys(event.gates)[0],
      tpId:form.typeId, code:encodeTicket(event.id,tId,uId),
      holderName:form.name.trim(), holderEmail:form.email.trim().toLowerCase(),
      holderPhone:form.phone.trim(), status:"unused", customData:{},
      registeredAt:new Date().toISOString(),
      paymentRef:form.payRef||"MANUAL", paymentStatus:"paid",
      paymentMethod:form.payMethod, notes:form.notes,
      isManual:true,
    };
    onIssue(ticket);
    if (form.email.trim()) {
      await sendTicketEmail(ticket, event, event.ticketTypes[form.typeId], notify);
    }
    setSending(false);
    onClose();
    setForm({ name:"", email:"", phone:"", typeId:Object.keys(event.ticketTypes)[0]||"", payMethod:"Bank Transfer", payRef:"", notes:"" });
    notify("Ticket issued" + (form.email.trim() ? " and emailed to " + form.email.trim() : " · No email sent (no address given)"));
  };

  return (
    <Modal open={open} onClose={onClose} title="Issue Manual Ticket (Offline Payment)" width={520}>
      <div style={{padding:12,marginBottom:16,background:T.gold+"12",borderRadius:10,border:`1px solid ${T.gold+"30"}`}}>
        <p style={{fontSize:13,color:T.gold,fontWeight:600}}>
          Use this to issue a ticket to someone who paid offline (bank transfer, cash, POS, etc.).
          A signed QR ticket will be generated and optionally emailed to them.
        </p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Full Name" value={form.name} onChange={set("name")} required/>
          <Inp label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="+234 xxx xxx xxxx"/>
        </div>
        <Inp label="Email Address (for ticket delivery)" type="email" value={form.email} onChange={set("email")} placeholder="Optional but recommended"/>
        <Inp label="Ticket Type" value={form.typeId} onChange={set("typeId")} options={Object.entries(event.ticketTypes).map(([id,t])=>({value:id,label:`${t.name} — ₦${t.price.toLocaleString()}`}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Payment Method" value={form.payMethod} onChange={set("payMethod")} options={["Bank Transfer","Cash","POS","Cheque","Crypto","Other"].map(v=>({value:v,label:v}))}/>
          <Inp label="Payment Reference / Receipt" value={form.payRef} onChange={set("payRef")} placeholder="e.g. GTB-2345678"/>
        </div>
        <Inp label="Notes (optional)" type="textarea" value={form.notes} onChange={set("notes")} placeholder="Any additional notes…" rows={2}/>
        <div style={{display:"flex",gap:10}}>
          <Btn v="secondary" full onClick={onClose}>Cancel</Btn>
          <Btn full onClick={submit} disabled={sending}>
            {sending ? "Issuing…" : <><Ticket size={14}/> Issue Ticket{form.email?" & Send Email":""}</>}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function EventDetail({ event, onBack, onNav, notify, onAddTicket, onApprovePayment, onRejectPayment }) {
  const { mobile } = useMedia();
  const [showQR, setShowQR] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [search, setSearch] = useState("");
  const [fGate, setFGate] = useState("all");
  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");

  const used    = event.tickets.filter(t=>t.status==="used").length;
  const pending = event.tickets.filter(t=>t.paymentStatus==="pending");
  const link    = `https://evenova.ng/e/${event.id}`;

  const filtered = useMemo(()=>
    event.tickets.filter(t=>
      (fGate==="all"||t.gId===fGate) &&
      (fType==="all"||t.tpId===fType) &&
      (fStatus==="all"||t.status===fStatus) &&
      (!search||t.holderName.toLowerCase().includes(search.toLowerCase())||t.id.toLowerCase().includes(search.toLowerCase())||t.holderEmail?.toLowerCase().includes(search.toLowerCase()))
    )
  ,[event.tickets,fGate,fType,fStatus,search]);

  return (
    <div style={{maxWidth:1200,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:13,marginBottom:20}}><ChevronLeft size={15}/>Back</button>

      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:20}}>
        <div>
          <h1 className="outfit" style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:4}}>{event.title}</h1>
          <p style={{fontSize:13,color:T.muted}}>{event.date} · {event.venue}</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn sz="sm" v="secondary" onClick={()=>exportAttendees(event)}><Download size={13}/>Export CSV</Btn>
          <Btn sz="sm" v="secondary" onClick={()=>onNav("scanner",event.id)}><Scan size={13}/>Scanner</Btn>
          <Btn sz="sm" v="secondary" onClick={()=>setShowManual(true)}><Plus size={13}/>Manual Ticket</Btn>
          <Btn sz="sm" onClick={()=>onNav("live",event.id)}><Activity size={13}/>Live Stats</Btn>
        </div>
      </div>

      {/* Reg link */}
      <Card style={{padding:14,marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <Globe size={15} style={{color:T.accent,flexShrink:0}}/>
          <div style={{flex:1,minWidth:200}}>
            <p style={{fontSize:11,color:T.muted,marginBottom:2}}>Public Registration Link — share with attendees</p>
            <code style={{fontSize:12,color:T.accentL}}>{link}</code>
          </div>
          <Btn sz="xs" v="secondary" onClick={()=>{navigator.clipboard?.writeText(link);notify("Copied!");}}><Copy size={11}/>Copy</Btn>
          <Btn sz="xs" onClick={()=>onNav("public-event",event.id)}><Eye size={11}/>Preview</Btn>
        </div>
      </Card>

      {/* Stats row */}
      <div className="g4" style={{marginBottom:24}}>
        <StatCard label="Total Tickets" value={event.tickets.length} icon={Ticket} color={T.accent}/>
        <StatCard label="Checked In" value={used} icon={CheckCircle} color={T.success}/>
        <StatCard label="Remaining" value={event.tickets.length-used} icon={Clock} color={T.gold}/>
        <StatCard label="Check-in %" value={`${event.tickets.length?Math.round(used/event.tickets.length*100):0}%`} icon={TrendingUp} color={T.info}/>
      </div>

      {/* Gates + Ticket types */}
      <div className="g2" style={{marginBottom:24}}>
        <Card style={{padding:20}}>
          <h3 style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12,textTransform:"uppercase",letterSpacing:".06em"}}>Entry Gates</h3>
          {Object.entries(event.gates).map(([gId,g])=>{
            const gUsed=event.tickets.filter(t=>t.gId===gId&&t.status==="used").length;
            const gTot=event.tickets.filter(t=>t.gId===gId).length;
            return (
              <div key={gId} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:g.color}}/>
                <span style={{fontSize:13,color:T.text,flex:1}}>{g.name}</span>
                <span style={{fontSize:12,color:T.muted}}>{gUsed}/{gTot}</span>
              </div>
            );
          })}
        </Card>
        <Card style={{padding:20}}>
          <h3 style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12,textTransform:"uppercase",letterSpacing:".06em"}}>Ticket Tiers</h3>
          {Object.entries(event.ticketTypes).map(([tid,t])=>{
            const cnt=event.tickets.filter(tk=>tk.tpId===tid).length;
            return (
              <div key={tid} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:t.color}}/>
                <span style={{fontSize:13,color:T.text,flex:1}}>{t.name}</span>
                <span style={{fontSize:12,color:T.muted}}>{cnt}</span>
                <span style={{fontSize:12,fontWeight:700,color:T.gold}}>₦{t.price.toLocaleString()}</span>
              </div>
            );
          })}
        </Card>
      </div>

      {/* ── Pending Bank Payments ─────────────────────────────── */}
      {pending.length > 0 && (
        <Card style={{ padding:24, marginBottom:24, border:`1px solid ${T.gold+"40"}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:700, color:T.text }}>
                ⏳ Pending Payments
                <span style={{ marginLeft:8, padding:"2px 10px", borderRadius:100, fontSize:12, background:T.gold+"22", color:T.gold, fontWeight:700 }}>
                  {pending.length}
                </span>
              </h3>
              <p style={{ fontSize:12, color:T.muted, marginTop:2 }}>Bank transfers awaiting your confirmation</p>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {pending.map(t => {
              const tp = event.ticketTypes[t.tpId];
              return (
                <div key={t.id} style={{ padding:16, borderRadius:12, border:`1px solid ${T.border}`, background:T.surface+"60" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div>
                      <p style={{ fontSize:14, fontWeight:700, color:T.text }}>{t.holderName}</p>
                      <p style={{ fontSize:12, color:T.muted }}>{t.holderEmail}</p>
                      <p style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                        {tp?.name} · Submitted {new Date(t.registeredAt).toLocaleString()}
                      </p>
                    </div>
                    <span style={{ fontSize:14, fontWeight:800, color:T.gold }}>₦{tp?.price?.toLocaleString()}</span>
                  </div>

                  {/* Receipt preview */}
                  {t.receiptUrl && (
                    <div style={{ marginBottom:12 }}>
                      <p style={{ fontSize:11, color:T.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Transfer Receipt</p>
                      {t.receiptUrl.startsWith("data:image") ? (
                        <img src={t.receiptUrl} alt="receipt"
                          style={{ maxWidth:"100%", maxHeight:220, borderRadius:10, objectFit:"contain", border:`1px solid ${T.border}`, display:"block" }}/>
                      ) : (
                        <a href={t.receiptUrl} target="_blank" rel="noreferrer"
                          style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, color:T.accentL,
                            padding:"7px 14px", borderRadius:8, border:`1px solid ${T.border}`, background:T.surface, textDecoration:"none" }}>
                          📄 View Receipt PDF
                        </a>
                      )}
                    </div>
                  )}

                  {!t.receiptUrl && (
                    <div style={{ marginBottom:12, padding:"8px 12px", borderRadius:8, background:T.danger+"12", border:`1px solid ${T.danger+"30"}`, fontSize:12, color:T.danger }}>
                      ⚠️ No receipt uploaded by attendee
                    </div>
                  )}

                  <div style={{ display:"flex", gap:8 }}>
                    <Btn sz="sm" v="success" onClick={() => onApprovePayment && onApprovePayment(event.id, t.id)}>
                      ✓ Approve & Issue Ticket
                    </Btn>
                    <Btn sz="sm" v="danger" onClick={() => onRejectPayment && onRejectPayment(event.id, t.id)}>
                      ✕ Reject
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Manual Ticket Modal */}
      <ManualTicketModal open={showManual} onClose={()=>setShowManual(false)} event={event}
        onIssue={t=>onAddTicket&&onAddTicket(event.id,t)} notify={notify}/>

      {/* QR Modal */}
      <Modal open={!!showQR} onClose={()=>setShowQR(null)} title={showQR?`Ticket — ${showQR.holderName||"Unregistered"}`:""} width={440}>
        {showQR && (
          <div style={{textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><QRDisplay value={showQR.code} size={180}/></div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:14,flexWrap:"wrap"}}>
              <Bdg color="purple">{event.ticketTypes[showQR.tpId]?.name}</Bdg>
              <Bdg color={showQR.status==="used"?"green":"gray"}>{showQR.status==="used"?"✓ Checked In":"Unused"}</Bdg>
              <Bdg color="gray">{event.gates[showQR.gId]?.name}</Bdg>
            </div>
            <div style={{background:T.surface,borderRadius:10,padding:14,textAlign:"left"}}>
              <p style={{fontSize:11,color:T.muted,marginBottom:4}}>Ticket code (encoded in QR):</p>
              <code style={{fontSize:11,color:T.gold,wordBreak:"break-all"}}>{showQR.code}</code>
            </div>
          </div>
        )}
      </Modal>

      {/* Search + filters */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:200,padding:"9px 14px",borderRadius:10,background:T.surface,border:`1px solid ${T.border}`}}>
          <Search size={14} style={{color:T.muted}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, email, ticket ID…"
            style={{background:"none",border:"none",color:T.text,fontSize:13,flex:1,outline:"none"}}/>
          {search && <button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:T.muted,cursor:"pointer"}}><X size={12}/></button>}
        </div>
        {[
          [fGate,setFGate,[["all","All Gates"],...Object.entries(event.gates).map(([id,g])=>[id,g.name])]],
          [fType,setFType,[["all","All Types"],...Object.entries(event.ticketTypes).map(([id,t])=>[id,t.name])]],
          [fStatus,setFStatus,[["all","All Status"],["unused","Unused"],["used","Checked In"],["pending_payment","Pending Payment"]]],
        ].map(([val,setter,opts],i)=>(
          <select key={i} value={val} onChange={e=>setter(e.target.value)}
            style={{padding:"9px 12px",borderRadius:10,background:T.surface,border:`1px solid ${T.border}`,color:T.text,fontSize:13}}>
            {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span style={{fontSize:12,color:T.muted,whiteSpace:"nowrap"}}>{filtered.length} ticket{filtered.length!==1?"s":""}</span>
      </div>

      {/* Ticket list */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.slice(0,40).map(t=>{
          const gate=event.gates[t.gId]; const tp=event.ticketTypes[t.tpId];
          const isPending = t.paymentStatus === "pending";
          return (
            <Card key={t.id} style={{padding:mobile?"10px 14px":"12px 18px", opacity: isPending ? 0.8 : 1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:mobile?"wrap":"nowrap"}}>
                <div style={{width:34,height:34,borderRadius:10,background:(isPending?T.gold:gate?.color||T.accent)+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Ticket size={15} style={{color:isPending?T.gold:gate?.color||T.accent}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:700,color:T.text}}>{t.holderName||<span style={{color:T.muted,fontStyle:"italic"}}>Unregistered slot</span>}</p>
                  <p style={{fontSize:11,color:T.muted,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis"}}>{t.id}</p>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <Bdg color="gray">{gate?.name||"—"}</Bdg>
                  <Bdg color={tp?.color===T.gold?"gold":"purple"}>{tp?.name}</Bdg>
                  {isPending
                    ? <Bdg color="orange">⏳ Pending Payment</Bdg>
                    : <Bdg color={t.status==="used"?"green":"gray"}>{t.status==="used"?"✓ In":"Unused"}</Bdg>}
                  <button onClick={()=>setShowQR(t)} style={{padding:7,borderRadius:8,background:T.surface,border:`1px solid ${T.border}`,cursor:"pointer",color:T.muted}}>
                    <QrCode size={13}/>
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length>40 && <p style={{textAlign:"center",fontSize:13,color:T.muted,padding:12}}>+{filtered.length-40} more · use Export CSV to see all</p>}
        {filtered.length===0 && <Card style={{padding:40,textAlign:"center"}}><p style={{color:T.muted}}>No tickets match your filters</p></Card>}
      </div>
    </div>
  );
}