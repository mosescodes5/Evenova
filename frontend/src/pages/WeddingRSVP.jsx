import { useEffect, useState } from "react";
import { Heart, CheckCircle, XCircle, HelpCircle, MapPin, Calendar, Users, Loader } from "lucide-react";
import { T } from "../styles/theme.js";
import { Btn, Card } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";
import { api } from "../utils/api.js";

function CustomField({ field, value, onChange }) {
  const base = { width:"100%",padding:"10px 14px",borderRadius:10,fontSize:14,color:T.text,background:T.surface,border:`1px solid ${T.border}`,fontFamily:"inherit" };
  const label = <label style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:6 }}>{field.label}{field.required&&<span style={{ color:T.danger,marginLeft:3 }}>*</span>}</label>;
  if (field.type==="select"&&field.options?.length) return <div>{label}<select value={value||""} onChange={e=>onChange(e.target.value)} style={base}><option value="">— Select —</option>{field.options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>;
  if (field.type==="textarea") return <div>{label}<textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder} rows={3} style={{ ...base,resize:"vertical" }}/></div>;
  return <div>{label}<input type={field.type||"text"} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder} style={base}/></div>;
}

function useCountdown(dateStr, timeStr) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!dateStr) return;
    const target = new Date(`${dateStr}T${timeStr||"00:00"}`);
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setLeft({ done:true }); return; }
      setLeft({
        done:false,
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [dateStr, timeStr]);
  return left;
}

export default function WeddingRSVP({ eventId, code, notify }) {
  const { mobile } = useMedia();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [guest, setGuest] = useState(null);
  const [event, setEvent] = useState(null);

  const [status, setStatus] = useState(null);
  const [attendingCount, setAttendingCount] = useState(1);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const countdown = useCountdown(event?.date, event?.time);

  useEffect(() => {
    if (!eventId || !code) { setLoadError("This invite link looks incomplete."); setLoading(false); return; }
    api.getWeddingInvite(eventId, code)
      .then(({ guest, event }) => {
        setGuest(guest); setEvent(event);
        setStatus(guest.rsvpStatus !== "pending" ? guest.rsvpStatus : null);
        setAttendingCount(guest.attendingCount || 1);
        setFormData(guest.rsvpData || {});
      })
      .catch(e => setLoadError(e.message || "This invite link doesn't seem to be valid."))
      .finally(() => setLoading(false));
  }, [eventId, code]);

  const submit = async () => {
    if (!status) { notify?.("Let us know if you're able to make it!", "error"); return; }
    const missing = (event.regFields||[]).filter(f=>f.required && status==="attending" && !formData[f.id]);
    if (missing.length) { notify?.("Please fill in: " + missing.map(f=>f.label).join(", "), "error"); return; }

    setSubmitting(true);
    try {
      await api.submitRsvp(eventId, code, {
        status,
        attendingCount: status==="attending" ? attendingCount : undefined,
        rsvpData: formData,
      });
      setSubmitted(true);
    } catch (e) {
      notify?.(e.message || "Couldn't submit your RSVP — please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight:"70vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <Loader size={22} style={{ color:T.muted, animation:"spin 1s linear infinite" }}/>
    </div>
  );

  if (loadError) return (
    <div style={{ minHeight:"70vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <Card style={{ padding:32,maxWidth:420,textAlign:"center" }}>
        <XCircle size={28} style={{ color:T.danger,marginBottom:12 }}/>
        <p style={{ fontSize:15,fontWeight:700,color:T.text,marginBottom:6 }}>Invite not found</p>
        <p style={{ fontSize:13,color:T.muted }}>{loadError}</p>
      </Card>
    </div>
  );

  const couple = event.coupleNames || {};
  const firstName = guest.name.split(" ")[0];

  return (
    <div style={{ background:"linear-gradient(180deg, #1a0a2e 0%, #0d0616 100%)", minHeight:"100vh", paddingBottom:60 }}>
      {/* Hero */}
      <div style={{ padding: mobile ? "56px 20px 40px" : "80px 24px 56px", textAlign:"center" }}>
        <Heart size={26} fill="#ec4899" style={{ color:"#ec4899", marginBottom:18 }}/>
        <p style={{ fontSize:12,fontWeight:700,color:"#f9a8d4",textTransform:"uppercase",letterSpacing:".18em",marginBottom:14 }}>You're Invited</p>
        <h1 style={{ fontFamily:"Georgia, 'Times New Roman', serif", fontSize: mobile ? 34 : 52, fontWeight:400, color:"white", lineHeight:1.15, marginBottom:10 }}>
          {couple.partner1 || "?"} <span style={{ color:"#ec4899", fontStyle:"italic" }}>&</span> {couple.partner2 || "?"}
        </h1>
        {event.date && (
          <p style={{ fontSize:15,color:"#c4b5fd" }}>
            {new Date(`${event.date}T${event.time||"00:00"}`).toLocaleDateString(undefined,{ weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </p>
        )}

        {countdown && !countdown.done && (
          <div style={{ display:"flex", gap:mobile?12:20, justifyContent:"center", marginTop:28 }}>
            {[["days","Days"],["hours","Hours"],["minutes","Minutes"]].map(([k,l])=>(
              <div key={k} style={{ minWidth:64, padding:"12px 8px", borderRadius:14, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ fontSize:24,fontWeight:800,color:"white" }}>{countdown[k]}</p>
                <p style={{ fontSize:10,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".06em" }}>{l}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ maxWidth:560, margin:"0 auto", padding: mobile?"0 16px":"0 24px", display:"flex", flexDirection:"column", gap:20 }}>

        {/* Personal greeting */}
        <Card style={{ padding:24, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontSize:16, color:"white", lineHeight:1.7 }}>
            Dear <strong style={{ color:"#f9a8d4" }}>{guest.partyLabel ? guest.name : firstName}</strong>,
            {guest.maxPartySize > 1
              ? ` we'd love for you and your party (up to ${guest.maxPartySize}) to celebrate with us.`
              : " we'd love for you to celebrate with us."}
          </p>
        </Card>

        {/* Story */}
        {event.weddingStory && (
          <Card style={{ padding:24, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ fontSize:11,fontWeight:700,color:"#f9a8d4",textTransform:"uppercase",letterSpacing:".1em",marginBottom:10 }}>Our Story</p>
            <p style={{ fontSize:14, color:"#e2d9f3", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{event.weddingStory}</p>
          </Card>
        )}

        {/* Details */}
        <Card style={{ padding:24, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <MapPin size={16} style={{ color:"#ec4899", marginTop:2, flexShrink:0 }}/>
              <div><p style={{ fontSize:14,color:"white",fontWeight:600 }}>{event.venue}</p><p style={{ fontSize:12,color:"#94a3b8" }}>{event.city}</p></div>
            </div>
            {event.time && (
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <Calendar size={16} style={{ color:"#ec4899", marginTop:2, flexShrink:0 }}/>
                <p style={{ fontSize:14,color:"white" }}>{event.time}</p>
              </div>
            )}
            {event.rsvpDeadline && (
              <p style={{ fontSize:12, color:"#94a3b8" }}>Please RSVP by {new Date(event.rsvpDeadline).toLocaleDateString()}</p>
            )}
          </div>
        </Card>

        {/* RSVP */}
        <Card style={{ padding:24 }}>
          {submitted ? (
            <div style={{ textAlign:"center", padding:"16px 0" }}>
              <CheckCircle size={30} style={{ color:T.success, marginBottom:12 }}/>
              <p style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:6 }}>
                {status==="attending" ? "You're on the list! 🎉" : status==="declined" ? "Thanks for letting us know" : "Got it — we'll keep a spot just in case"}
              </p>
              <p style={{ fontSize:13, color:T.muted }}>You can come back to this link anytime to update your response.</p>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:16 }}>Will you be attending?</h3>
              <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
                {[
                  ["attending","Joyfully Accept",CheckCircle,T.success],
                  ["maybe","Maybe",HelpCircle,T.gold],
                  ["declined","Regretfully Decline",XCircle,T.danger],
                ].map(([val,label,Icon,color])=>(
                  <button key={val} onClick={()=>setStatus(val)}
                    style={{ flex:"1 1 140px", padding:"14px 10px", borderRadius:12, cursor:"pointer", textAlign:"center",
                      border:`1.5px solid ${status===val?color:T.border}`,
                      background:status===val?color+"18":"transparent" }}>
                    <Icon size={18} style={{ color:status===val?color:T.muted, marginBottom:6 }}/>
                    <p style={{ fontSize:12.5, fontWeight:700, color:status===val?color:T.text }}>{label}</p>
                  </button>
                ))}
              </div>

              {status==="attending" && (
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em",display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
                    <Users size={12}/> How many in your party? (up to {guest.maxPartySize})
                  </label>
                  <div style={{ display:"flex", gap:8 }}>
                    {Array.from({length:guest.maxPartySize},(_,i)=>i+1).map(n=>(
                      <button key={n} onClick={()=>setAttendingCount(n)}
                        style={{ width:40,height:40,borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,
                          border:`1.5px solid ${attendingCount===n?T.accent:T.border}`,
                          background:attendingCount===n?T.accent+"20":"transparent",
                          color:attendingCount===n?T.accentL:T.text }}>{n}</button>
                    ))}
                  </div>
                </div>
              )}

              {status==="attending" && (event.regFields||[]).length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
                  {event.regFields.map(f=>(
                    <CustomField key={f.id} field={f} value={formData[f.id]} onChange={v=>setFormData(d=>({...d,[f.id]:v}))}/>
                  ))}
                </div>
              )}

              <Btn full sz="lg" onClick={submit} disabled={submitting || !status}>
                {submitting ? "Submitting…" : "Submit RSVP"}
              </Btn>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
