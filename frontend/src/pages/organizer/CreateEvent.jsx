import { useState } from "react";
import { CheckCircle, CheckSquare, ChevronLeft, ChevronRight, Edit, Filter, Heart, Image, Music, Phone, Plus, Search, Sparkles, Ticket, Trash2, Upload, Users } from "lucide-react";
import { GA, T, SERVICE_CHARGE_PCT, calcServiceCharge } from "../../styles/theme.js";
import { Btn, Card, Inp } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { genId, genUUID, encodeTicket, verifyQR } from "../../utils/crypto.js";
import { DEF_FIELDS } from "../../data/seedData.js";
import { api } from "../../utils/api.js";
import { KEYS, storGet } from "../../utils/storage.js";

const WEDDING_FIELD_PRESETS = [
  { label:"Meal Choice", type:"select", required:true, options:["Chicken","Fish","Vegetarian"] },
  { label:"Dietary Restrictions / Allergies", type:"text", required:false, placeholder:"e.g. nut allergy, halal" },
  { label:"Song Request", type:"text", required:false, placeholder:"A song that'll get you on the dance floor" },
  { label:"Message for the Couple", type:"textarea", required:false, placeholder:"" },
];

export default function CreateEvent({ org, onSubmit, onBack, notify }) {
  const { mobile } = useMedia();
  const [step, setStep] = useState(1);
  const [det, setDet] = useState({ title:"", desc:"", date:"", time:"18:00", endTime:"22:00", venue:"", city:"Lagos", category:"Music", banner:"music", coverImage:"", feeMode:"pass_through", isFree:false, isWedding:false, coupleP1:"", coupleP2:"", weddingStory:"" });
  const [weddingGuestsList, setWeddingGuestsList] = useState([]);
  const [guestDraft, setGuestDraft] = useState({ name:"", partyLabel:"", maxPartySize:"1" });
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [savingGuests, setSavingGuests] = useState(false);

  const [gates, setGates] = useState([
    { id:genId("GT"), name:"Main Entrance", color:"#7c3aed" },
    { id:genId("GT"), name:"VIP Gate",      color:"#f59e0b" },
  ]);
  const [types, setTypes] = useState([
    { id:genId("TP"), name:"Early Bird", price:"5000",  qty:"100", color:"#10b981", perksStr:"Discounted rate, General admission, Wristband", ticketImage:"" },
    { id:genId("TP"), name:"Regular",    price:"12000", qty:"300", color:"#7c3aed", perksStr:"General admission, Wristband", ticketImage:"" },
    { id:genId("TP"), name:"VIP",        price:"35000", qty:"100", color:"#f59e0b", perksStr:"Priority entry, Lounge access, Free drinks", ticketImage:"" },
  ]);
  const [fields, setFields] = useState(DEF_FIELDS.map(f=>({...f})));
  const [count, setCount] = useState("60");
  const COLORS = ["#7c3aed","#f59e0b","#10b981","#3b82f6","#ef4444","#f97316","#06b6d4","#a855f7"];

  const setD = k => v => setDet(d=>({...d,[k]:v}));
  const addGate = () => setGates(g=>[...g,{id:genId("GT"),name:`Gate ${g.length+1}`,color:COLORS[g.length%COLORS.length]}]);
  const setGate = (id,k,v) => setGates(g=>g.map(x=>x.id===id?{...x,[k]:v}:x));
  const addType = () => setTypes(t=>[...t,{id:genId("TP"),name:"New Tier",price:"10000",qty:"200",color:COLORS[t.length%COLORS.length],perksStr:"",ticketImage:""}]);
  const setType = (id,k,v) => setTypes(t=>t.map(x=>x.id===id?{...x,[k]:v}:x));
  const handleTicketImage = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setType(id, "ticketImage", e.target.result);
    reader.readAsDataURL(file);
  };
  const handleCoverImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setD("coverImage")(e.target.result);
    reader.readAsDataURL(file);
  };
  const addField = () => setFields(f=>[...f,{id:genId("FL"),label:"Custom Field",type:"text",required:false,placeholder:""}]);
  const setField = (id,k,v) => setFields(f=>f.map(x=>x.id===id?{...x,[k]:v}:x));
  const addPresetField = (preset) => {
    if (fields.some(f=>f.label===preset.label)) return; // already added
    setFields(f=>[...f,{id:genId("FL"),...preset}]);
  };

  const addGuestDraft = () => {
    if (!guestDraft.name.trim()) return;
    setWeddingGuestsList(g=>[...g,{
      id:genId("GST"), name:guestDraft.name.trim(),
      partyLabel:guestDraft.partyLabel.trim(),
      maxPartySize:Math.max(1,parseInt(guestDraft.maxPartySize)||1),
    }]);
    setGuestDraft({ name:"", partyLabel:"", maxPartySize:"1" });
  };
  const removeGuestDraft = (id) => setWeddingGuestsList(g=>g.filter(x=>x.id!==id));
  const applyBulkPaste = () => {
    // One guest per line: "Name" or "Name, Party Label, Max Party Size"
    const rows = bulkPasteText.split("\n").map(l=>l.trim()).filter(Boolean).map(line=>{
      const [name,partyLabel,maxPartySize] = line.split(",").map(s=>s?.trim());
      return { id:genId("GST"), name, partyLabel:partyLabel||"", maxPartySize:Math.max(1,parseInt(maxPartySize)||1) };
    }).filter(g=>g.name);
    if (rows.length) { setWeddingGuestsList(g=>[...g,...rows]); setBulkPasteText(""); }
  };

  const submit = async () => {
    if (!org?.id) {
      notify?.("Your organizer profile hasn't finished loading yet — please wait a moment and try again, or refresh the page.", "error");
      return;
    }
    if (det.isWedding) {
      if (!det.coupleP1.trim() || !det.coupleP2.trim() || !det.date || !det.venue) {
        notify?.("Add both partners' names, the date, and venue before creating the wedding.", "error");
        setStep(1);
        return;
      }
    } else if (!det.title || !det.date || !det.venue) {
      notify?.("Add an event title, date, and venue before creating the event.", "error");
      setStep(1);
      return;
    }
    const evId=genUUID();
    const gatesObj=Object.fromEntries(gates.map(g=>[g.id,{name:g.name,color:g.color}]));

    // Weddings don't use the ticket-tier/generate-N-tickets system at all —
    // guests RSVP through their personal invite link instead (see
    // weddingGuestsList, uploaded separately below once the event exists).
    const typesObj = det.isWedding ? {} : Object.fromEntries(types.map(t=>[t.id,{name:t.name,price:det.isFree?0:(parseInt(t.price)||0),qty:parseInt(t.qty)||100,color:t.color,perks:t.perksStr.split(",").map(s=>s.trim()).filter(Boolean)}]));
    const tickets = [];
    if (!det.isWedding) {
      const gKeys=Object.keys(gatesObj), tKeys=Object.keys(typesObj);
      const n=parseInt(count)||60;
      for (let i=0;i<n;i++) {
        const tId=genId("TKT"),uId=genId("USR");
        const gId=gKeys[i%gKeys.length];
        const tpId=i<n*.2?tKeys[0]:i<n*.75?tKeys[1]:tKeys[2]||tKeys[tKeys.length-1];
        tickets.push({id:tId,evId,uId,gId,tpId,code:encodeTicket(evId,tId,uId),holderName:"",holderEmail:"",holderPhone:"",status:"unused",customData:{},registeredAt:new Date().toISOString()});
      }
    }

    const title = det.isWedding && !det.title.trim() ? `${det.coupleP1} & ${det.coupleP2}'s Wedding` : det.title;
    const eventPayload = {
      id:evId, orgId:org.id, ...det, title,
      isFree: det.isWedding ? true : det.isFree, // weddings are always free for guests
      isWedding: det.isWedding,
      coupleNames: det.isWedding ? { partner1:det.coupleP1, partner2:det.coupleP2 } : null,
      weddingStory: det.isWedding ? det.weddingStory : null,
      status:"upcoming", featured:false, checkinCount:0,
      gates:gatesObj, ticketTypes:typesObj, regFields:fields, tickets,
    };

    let created;
    try {
      created = await onSubmit(eventPayload);
    } catch (e) {
      // onSubmit already shows its own error notify — nothing more to do
      // here, just don't try to upload guests for an event that didn't save.
      return;
    }

    if (det.isWedding && weddingGuestsList.length) {
      setSavingGuests(true);
      const token = storGet(KEYS.TOKEN, null);
      try {
        await api.addWeddingGuestsBulk(evId, weddingGuestsList.map(({id,...g})=>g), token);
        notify?.(`Wedding created! ${weddingGuestsList.length} guest invite(s) ready to share.`);
      } catch (e) {
        notify?.(`Wedding created, but the guest list failed to upload: ${e.message || "unknown error"}. You can add guests from the event page.`, "error");
      } finally {
        setSavingGuests(false);
      }
    }
  };

  const STEPS = det.isWedding ? ["Details","Gates","Guest List","RSVP Form"] : ["Details","Gates","Ticket Tiers","Reg Form"];
  return (
    <div style={{maxWidth:780,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:13,marginBottom:20}}><ChevronLeft size={15}/>Back</button>
      <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text,marginBottom:20}}>Create New Event</h1>

      {/* Step bar */}
      <div style={{display:"flex",gap:4,padding:4,background:T.surface,borderRadius:14,marginBottom:24}}>
        {STEPS.map((s,i)=>(
          <button key={i} onClick={()=>setStep(i+1)}
            style={{flex:1,padding:"8px 4px",borderRadius:10,border:"none",fontWeight:700,fontSize:12,
              background:step===i+1?T.card:"transparent",color:step===i+1?T.text:T.muted,cursor:"pointer",transition:"all .2s"}}>
            <span style={{width:20,height:20,borderRadius:"50%",background:step>i+1?T.success:step===i+1?GA:T.border,
              color:"white",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,marginRight:6}}>
              {step>i+1?<CheckCircle size={11}/>:i+1}
            </span>
            <span className="hide-mobile">{s}</span>
          </button>
        ))}
      </div>

      {step===1 && (
        <Card style={{padding:28}}>
          <h2 style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:20}}>{det.isWedding?"Wedding Details":"Event Details"}</h2>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:8}}>What are you creating?</label>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {[
                  [false,"Standard Event","Ticketed events, conferences, parties — the usual flow."],
                  [true,"Wedding","Personal named invites, guest RSVPs, no tickets or pricing."],
                ].map(([val,label,desc])=>(
                  <button key={String(val)} type="button" onClick={()=>setD("isWedding")(val)}
                    style={{flex:"1 1 220px",textAlign:"left",padding:"12px 14px",borderRadius:12,cursor:"pointer",
                      border:`1.5px solid ${det.isWedding===val?"#ec4899":"#33415560"}`,
                      background:det.isWedding===val?"#ec489918":"transparent"}}>
                    <p style={{fontSize:13,fontWeight:700,color:det.isWedding===val?"#f9a8d4":T.text,marginBottom:3,display:"flex",alignItems:"center",gap:6}}>
                      {val && <Heart size={13} style={{color:"#ec4899"}}/>}{label}
                    </p>
                    <p style={{fontSize:11.5,color:"#94a3b8",lineHeight:1.5}}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {det.isWedding ? (
              <>
                <div className="g2">
                  <Inp label="Partner 1's Name" value={det.coupleP1} onChange={setD("coupleP1")} required/>
                  <Inp label="Partner 2's Name" value={det.coupleP2} onChange={setD("coupleP2")} required/>
                </div>
                <Inp label="Wedding Title (optional — auto-filled from your names if left blank)" value={det.title} onChange={setD("title")} placeholder={det.coupleP1&&det.coupleP2?`${det.coupleP1} & ${det.coupleP2}'s Wedding`:""}/>
                <Inp label="Your Story (optional)" type="textarea" value={det.weddingStory} onChange={setD("weddingStory")} rows={3} placeholder="How you met, the proposal, whatever you'd like to share with your guests"/>
              </>
            ) : (
              <>
                <Inp label="Event Title" value={det.title} onChange={setD("title")} required/>
                <Inp label="Description" type="textarea" value={det.desc} onChange={setD("desc")} rows={3}/>
              </>
            )}
            <div className="g2">
              <Inp label="Date" type="date" value={det.date} onChange={setD("date")} required/>
              {!det.isWedding && (
                <Inp label="Category" value={det.category} onChange={v=>{setD("category")(v);setD("banner")(v.toLowerCase().replace(/[^a-z]/g,"").slice(0,6)||"music");}}
                  options={["Music","Technology","Food & Drinks","Arts","Sports","Fashion","Business"].map(v=>({value:v,label:v}))}/>
              )}
              <Inp label="Start Time" type="time" value={det.time} onChange={setD("time")}/>
              <Inp label="End Time" type="time" value={det.endTime} onChange={setD("endTime")}/>
            </div>
            <Inp label="Venue" value={det.venue} onChange={setD("venue")} required/>
            {det.isWedding ? (
              <Inp label="City" value={det.city} onChange={setD("city")} options={["Lagos","Abuja","Port Harcourt","Kano","Ibadan","Enugu"].map(v=>({value:v,label:v}))}/>
            ) : (
              <div className="g2">
                <Inp label="City" value={det.city} onChange={setD("city")} options={["Lagos","Abuja","Port Harcourt","Kano","Ibadan","Enugu"].map(v=>({value:v,label:v}))}/>
                <Inp label="Tickets to Generate" type="number" value={count} onChange={setCount}/>
              </div>
            )}
            {det.isWedding ? (
              <div style={{padding:14,borderRadius:12,background:"#ec489912",border:"1px solid #ec489930",display:"flex",alignItems:"center",gap:8}}>
                <Heart size={14} style={{color:"#ec4899",flexShrink:0}}/>
                <p style={{fontSize:12.5,color:"#f9a8d4"}}>Weddings are always free for your guests — no ticket pricing or checkout step.</p>
              </div>
            ) : (
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:8}}>Is this a free event?</label>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {[
                  [false,"Paid — sell tickets","Set prices per tier. Payments are collected automatically via Korapay."],
                  [true,"Free — no payment required","Attendees register instantly with no checkout step."],
                ].map(([val,label,desc])=>(
                  <button key={String(val)} type="button" onClick={()=>setD("isFree")(val)}
                    style={{flex:"1 1 220px",textAlign:"left",padding:"12px 14px",borderRadius:12,cursor:"pointer",
                      border:`1.5px solid ${det.isFree===val?"#7c3aed":"#33415560"}`,
                      background:det.isFree===val?"#7c3aed18":"transparent"}}>
                    <p style={{fontSize:13,fontWeight:700,color:det.isFree===val?"#c4b5fd":T.text,marginBottom:3}}>{label}</p>
                    <p style={{fontSize:11.5,color:"#94a3b8",lineHeight:1.5}}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>
            )}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:8}}>Event Image (used as the ticket background)</label>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {det.coverImage
                  ? <div style={{position:"relative",width:120,height:68,borderRadius:8,overflow:"hidden",border:"1px solid #33415540"}}>
                      <img src={det.coverImage} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      <button onClick={()=>setD("coverImage")("")} style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:4,background:"rgba(0,0,0,.7)",border:"none",color:"white",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                    </div>
                  : <div style={{width:120,height:68,borderRadius:8,border:"1.5px dashed #7c3aed50",background:"#7c3aed08",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Image size={20} color="#7c3aed80"/>
                    </div>
                }
                <label style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:10,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  <Upload size={13}/>{det.coverImage?"Change":"Upload Image"}
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleCoverImage(e.target.files[0])}/>
                </label>
              </div>
              <p style={{fontSize:11,color:"#64748b",marginTop:8}}>Shown on the event page and used as the ticket background for attendees. Individual ticket tiers can override this with their own art in the next step.</p>
            </div>
          </div>
          <Btn full style={{marginTop:20}} onClick={()=>{
            const ok = det.isWedding ? (det.coupleP1&&det.coupleP2&&det.date&&det.venue) : (det.title&&det.date&&det.venue);
            if (ok) setStep(2);
          }}>Next: Configure Gates <ChevronRight size={14}/></Btn>
        </Card>
      )}

      {step===2 && (
        <Card style={{padding:28}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
            <div><h2 style={{fontSize:17,fontWeight:700,color:T.text}}>Entry Gates</h2><p style={{fontSize:13,color:T.muted,marginTop:4}}>Name your entry points. Assign staff to each gate.</p></div>
            <Btn sz="sm" onClick={addGate} icon={<Plus size={13}/>}>Add Gate</Btn>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            {gates.map(g=>(
              <div key={g.id} style={{display:"flex",alignItems:"center",gap:12,padding:14,borderRadius:12,background:T.surface,border:`1px solid ${T.border}`}}>
                <div style={{display:"flex",gap:3,flexShrink:0}}>
                  {COLORS.slice(0,6).map(col=><div key={col} onClick={()=>setGate(g.id,"color",col)} style={{width:18,height:18,borderRadius:"50%",background:col,cursor:"pointer",border:g.color===col?"2px solid white":"2px solid transparent"}}/>)}
                </div>
                <input value={g.name} onChange={e=>setGate(g.id,"name",e.target.value)} style={{flex:1,background:"transparent",border:"none",color:T.text,fontSize:14,fontWeight:700,outline:"none"}}/>
                <div style={{width:24,height:24,borderRadius:6,background:g.color+"30"}}/>
                {gates.length>1 && <button onClick={()=>setGates(g2=>g2.filter(x=>x.id!==g.id))} style={{background:"none",border:"none",color:T.danger,cursor:"pointer"}}><Trash2 size={14}/></button>}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}><Btn v="secondary" onClick={()=>setStep(1)}><ChevronLeft size={14}/>Back</Btn><Btn full onClick={()=>setStep(3)}>Next: Ticket Tiers <ChevronRight size={14}/></Btn></div>
        </Card>
      )}

      {step===3 && det.isWedding && (
        <Card style={{padding:28}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
            <div>
              <h2 style={{fontSize:17,fontWeight:700,color:T.text}}>Guest List</h2>
              <p style={{fontSize:13,color:T.muted,marginTop:4}}>Each guest or family gets their own personal invite link once the wedding is created.</p>
            </div>
          </div>

          <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap",marginBottom:14,padding:16,borderRadius:14,background:T.surface,border:`1px solid ${T.border}`}}>
            <div style={{flex:"2 1 180px"}}><Inp label="Guest / Family Name" value={guestDraft.name} onChange={v=>setGuestDraft(g=>({...g,name:v}))} placeholder="Jordan Family"/></div>
            <div style={{flex:"2 1 160px"}}><Inp label="Label (optional)" value={guestDraft.partyLabel} onChange={v=>setGuestDraft(g=>({...g,partyLabel:v}))} placeholder="Bride's side, College friends…"/></div>
            <div style={{flex:"1 1 100px"}}><Inp label="Party Size" type="number" value={guestDraft.maxPartySize} onChange={v=>setGuestDraft(g=>({...g,maxPartySize:v}))}/></div>
            <Btn sz="md" onClick={addGuestDraft} icon={<Plus size={13}/>}>Add</Btn>
          </div>

          <details style={{marginBottom:18}}>
            <summary style={{fontSize:12,color:T.muted,cursor:"pointer",userSelect:"none"}}>Or paste a whole list at once</summary>
            <div style={{marginTop:10}}>
              <Inp label="" type="textarea" rows={4}
                placeholder={"One guest per line:\nJordan Family\nSmith Family, Groom's side, 4\nAunt Sarah, , 2"}
                value={bulkPasteText} onChange={setBulkPasteText}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                <p style={{fontSize:11,color:"#64748b"}}>Format: Name, Label (optional), Party size (optional, defaults to 1)</p>
                <Btn sz="sm" v="secondary" onClick={applyBulkPaste} disabled={!bulkPasteText.trim()}>Add These</Btn>
              </div>
            </div>
          </details>

          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
            {weddingGuestsList.length===0 && (
              <div style={{textAlign:"center",padding:"32px 16px",color:T.muted,fontSize:13}}>
                <Users size={22} style={{opacity:.4,marginBottom:8}}/>
                <p>No guests added yet — add your list above, or skip this and add guests later from the event page.</p>
              </div>
            )}
            {weddingGuestsList.map(g=>(
              <div key={g.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:T.surface,border:`1px solid ${T.border}`}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:700,color:T.text}}>{g.name}</p>
                  <p style={{fontSize:11,color:T.muted}}>{g.partyLabel?`${g.partyLabel} · `:""}Party of {g.maxPartySize}</p>
                </div>
                <button onClick={()=>removeGuestDraft(g.id)} style={{background:"none",border:"none",color:T.danger,cursor:"pointer"}}><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}><Btn v="secondary" onClick={()=>setStep(2)}><ChevronLeft size={14}/>Back</Btn><Btn full onClick={()=>setStep(4)}>Next: RSVP Form <ChevronRight size={14}/></Btn></div>
        </Card>
      )}

      {step===3 && !det.isWedding && (
        <Card style={{padding:28}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <h2 style={{fontSize:17,fontWeight:700,color:T.text}}>Ticket Tiers</h2>
              <p style={{fontSize:13,color:T.muted,marginTop:4}}>3-tier pricing is pre-set: Early Bird / Regular / VIP. Edit as needed.</p>
            </div>
            <Btn sz="sm" onClick={addType} icon={<Plus size={13}/>}>Add Tier</Btn>
          </div>
          <div style={{marginBottom:22,padding:16,borderRadius:14,border:`1px solid #33415560`,background:"#7c3aed08"}}>
            {det.isFree ? (
              <p style={{fontSize:12.5,color:"#94a3b8",lineHeight:1.6}}>
                🔓 This is a free event — ticket prices are locked at ₦0 and no payment step is shown to attendees.
              </p>
            ) : (
            <>
            <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:10}}>Who pays the {SERVICE_CHARGE_PCT}% service fee?</label>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                ["pass_through","Attendee pays it","Added on top at checkout. You receive the full ticket price."],
                ["absorb","I'll absorb it","Attendee pays exactly the ticket price. The fee comes out of your payout."],
              ].map(([mode,label,desc])=>(
                <button key={mode} onClick={()=>setD("feeMode")(mode)}
                  style={{flex:"1 1 220px",textAlign:"left",padding:"12px 14px",borderRadius:12,cursor:"pointer",
                    border:`1.5px solid ${det.feeMode===mode?"#7c3aed":"#33415560"}`,
                    background:det.feeMode===mode?"#7c3aed18":"transparent"}}>
                  <p style={{fontSize:13,fontWeight:700,color:det.feeMode===mode?"#c4b5fd":T.text,marginBottom:3}}>{label}</p>
                  <p style={{fontSize:11.5,color:"#94a3b8",lineHeight:1.5}}>{desc}</p>
                </button>
              ))}
            </div>
            {Number(types[0]?.price)>0 && (()=>{ const p=Number(types[0].price); const fee=calcServiceCharge(p);
              return (
                <p style={{fontSize:11.5,color:"#64748b",marginTop:10}}>
                  Example on a ₦{p.toLocaleString()} ticket: {det.feeMode==="absorb"
                    ? <>attendee pays <strong style={{color:"#94a3b8"}}>₦{p.toLocaleString()}</strong>, you receive <strong style={{color:"#94a3b8"}}>₦{(p-fee).toLocaleString()}</strong></>
                    : <>attendee pays <strong style={{color:"#94a3b8"}}>₦{(p+fee).toLocaleString()}</strong>, you receive <strong style={{color:"#94a3b8"}}>₦{p.toLocaleString()}</strong></>}
                </p>
              );
            })()}
            </>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            {types.map(t=>(
              <div key={t.id} style={{padding:18,borderRadius:14,border:`2px solid ${t.color+"40"}`,background:t.color+"08"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{display:"flex",gap:4}}>{COLORS.slice(0,6).map(col=><div key={col} onClick={()=>setType(t.id,"color",col)} style={{width:18,height:18,borderRadius:"50%",background:col,cursor:"pointer",border:t.color===col?"2px solid white":"2px solid transparent"}}/>)}</div>
                  {types.length>1 && <button onClick={()=>setTypes(tt=>tt.filter(x=>x.id!==t.id))} style={{background:"none",border:"none",color:T.danger,cursor:"pointer"}}><Trash2 size={14}/></button>}
                </div>
                <div className="g3 g2">
                  <Inp label="Name" value={t.name} onChange={v=>setType(t.id,"name",v)}/>
                  {det.isFree
                    ? <div>
                        <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:8}}>Price</label>
                        <div style={{padding:"10px 14px",borderRadius:10,border:"1px solid #33415560",color:T.success,fontWeight:700,fontSize:13}}>Free</div>
                      </div>
                    : <Inp label="Price (₦)" type="number" value={t.price} onChange={v=>setType(t.id,"price",v)}/>}
                  <Inp label="Qty" type="number" value={t.qty} onChange={v=>setType(t.id,"qty",v)}/>
                </div>
                <div style={{marginTop:10}}><Inp label="Perks (comma separated)" value={t.perksStr} onChange={v=>setType(t.id,"perksStr",v)} placeholder="Priority entry, Lounge access"/></div>
                {/* Ticket art */}
                <div style={{marginTop:12}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:8}}>Ticket Art (optional)</label>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    {t.ticketImage
                      ? <div style={{position:"relative",width:80,height:48,borderRadius:8,overflow:"hidden",border:`1px solid ${t.color+"40"}`}}>
                          <img src={t.ticketImage} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          <button onClick={()=>setType(t.id,"ticketImage","")} style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:4,background:"rgba(0,0,0,.7)",border:"none",color:"white",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                        </div>
                      : <div style={{width:80,height:48,borderRadius:8,border:`1.5px dashed ${t.color+"50"}`,background:t.color+"08",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Image size={18} color={t.color+"80"}/>
                        </div>
                    }
                    <label style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:10,border:`1px solid ${"#334155"}`,background:"transparent",color:"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      <Upload size={13}/>{t.ticketImage?"Change":"Upload Image"}
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleTicketImage(t.id,e.target.files[0])}/>
                    </label>
                    <p style={{fontSize:11,color:"#475569",lineHeight:1.5}}>Shows as background art on the attendee's ticket</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}><Btn v="secondary" onClick={()=>setStep(2)}><ChevronLeft size={14}/>Back</Btn><Btn full onClick={()=>setStep(4)}>Next: Reg Form <ChevronRight size={14}/></Btn></div>
        </Card>
      )}

      {step===4 && (
        <Card style={{padding:28}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div><h2 style={{fontSize:17,fontWeight:700,color:T.text}}>{det.isWedding?"RSVP Form":"Registration Form"}</h2><p style={{fontSize:13,color:T.muted,marginTop:4}}>{det.isWedding?"Customize what you ask guests when they RSVP.":"Customize what you collect from attendees."}</p></div>
            <Btn sz="sm" onClick={addField} icon={<Plus size={13}/>}>Add Field</Btn>
          </div>
          <div style={{fontSize:12,color:T.muted,padding:"6px 0 14px"}}>First 3 are standard defaults (Name, Email, Phone)</div>
          {det.isWedding && (
            <div style={{marginBottom:18,padding:14,borderRadius:12,background:"#ec489910",border:"1px solid #ec489930"}}>
              <p style={{fontSize:11,fontWeight:700,color:"#f9a8d4",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>Quick add — common wedding questions</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {WEDDING_FIELD_PRESETS.map(preset=>{
                  const added = fields.some(f=>f.label===preset.label);
                  return (
                    <button key={preset.label} onClick={()=>addPresetField(preset)} disabled={added}
                      style={{padding:"6px 12px",borderRadius:100,fontSize:12,fontWeight:600,cursor:added?"default":"pointer",
                        border:`1px solid ${added?T.success+"40":"#ec489940"}`,
                        background:added?T.success+"15":"transparent",color:added?T.success:"#f9a8d4",
                        display:"flex",alignItems:"center",gap:5}}>
                      {added?<CheckCircle size={11}/>:<Plus size={11}/>}{preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            {fields.map((f,idx)=>(
              <div key={f.id} style={{padding:14,borderRadius:12,background:T.surface,border:`1px solid ${T.border}`}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
                  <Inp label="Label" value={f.label} onChange={v=>setField(f.id,"label",v)}/>
                  <Inp label="Type" value={f.type} onChange={v=>setField(f.id,"type",v)}
                    options={["text","email","tel","select","textarea"].map(v=>({value:v,label:v}))}/>
                  <button onClick={()=>setField(f.id,"required",!f.required)}
                    style={{padding:"10px 12px",borderRadius:10,border:`1px solid ${f.required?T.success+"40":T.border}`,
                      background:f.required?T.success+"15":"transparent",color:f.required?T.success:T.muted,
                      fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,marginTop:20}}>
                    <CheckSquare size={13}/>{f.required?"Required":"Optional"}
                  </button>
                  {idx>=3 && <button onClick={()=>setFields(ff=>ff.filter(x=>x.id!==f.id))} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",padding:"0 4px",marginTop:20}}><Trash2 size={14}/></button>}
                </div>
                {f.type==="select" && (
                  <div style={{marginTop:10}}><Inp label="Options (comma separated)" value={f.options?.join(", ")||""} onChange={v=>setField(f.id,"options",v.split(",").map(s=>s.trim()).filter(Boolean))}/></div>
                )}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn v="secondary" onClick={()=>setStep(3)}><ChevronLeft size={14}/>Back</Btn>
            <Btn full v="gold" onClick={submit} disabled={savingGuests}>
              <Sparkles size={14}/>{savingGuests?"Saving guest list…":det.isWedding?"Create Wedding & Get Invite Links":"Create Event & Generate Tickets"}
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   23. EVENT DETAIL  — with Search/Filter + CSV Export
───────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   MANUAL TICKET MODAL  — issue a ticket to someone who paid
   offline (bank transfer, cash, POS, etc.)
───────────────────────────────────────────────────────────── */