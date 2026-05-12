import { useState } from "react";
import { CheckCircle, CheckSquare, ChevronLeft, ChevronRight, Edit, Filter, Music, Phone, Plus, Search, Sparkles, Ticket, Trash2 } from "lucide-react";
import { GA, T } from "../../styles/theme.js";
import { Btn, Card, Inp } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { genId, encodeTicket, verifyQR } from "../../utils/crypto.js";
import { DEF_FIELDS } from "../../data/seedData.js";

export default function CreateEvent({ org, onSubmit, onBack }) {
  const { mobile } = useMedia();
  const [step, setStep] = useState(1);
  const [det, setDet] = useState({ title:"", desc:"", date:"", time:"18:00", endTime:"22:00", venue:"", city:"Lagos", category:"Music", banner:"music" });
  const [gates, setGates] = useState([
    { id:genId("GT"), name:"Main Entrance", color:"#7c3aed" },
    { id:genId("GT"), name:"VIP Gate",      color:"#f59e0b" },
  ]);
  const [types, setTypes] = useState([
    { id:genId("TP"), name:"Early Bird", price:"5000",  qty:"100", color:"#10b981", perksStr:"Discounted rate, General admission, Wristband" },
    { id:genId("TP"), name:"Regular",    price:"12000", qty:"300", color:"#7c3aed", perksStr:"General admission, Wristband" },
    { id:genId("TP"), name:"VIP",        price:"35000", qty:"100", color:"#f59e0b", perksStr:"Priority entry, Lounge access, Free drinks" },
  ]);
  const [fields, setFields] = useState(DEF_FIELDS.map(f=>({...f})));
  const [count, setCount] = useState("60");
  const COLORS = ["#7c3aed","#f59e0b","#10b981","#3b82f6","#ef4444","#f97316","#06b6d4","#a855f7"];

  const setD = k => v => setDet(d=>({...d,[k]:v}));
  const addGate = () => setGates(g=>[...g,{id:genId("GT"),name:`Gate ${g.length+1}`,color:COLORS[g.length%COLORS.length]}]);
  const setGate = (id,k,v) => setGates(g=>g.map(x=>x.id===id?{...x,[k]:v}:x));
  const addType = () => setTypes(t=>[...t,{id:genId("TP"),name:"New Tier",price:"10000",qty:"200",color:COLORS[t.length%COLORS.length],perksStr:""}]);
  const setType = (id,k,v) => setTypes(t=>t.map(x=>x.id===id?{...x,[k]:v}:x));
  const addField = () => setFields(f=>[...f,{id:genId("FL"),label:"Custom Field",type:"text",required:false,placeholder:""}]);
  const setField = (id,k,v) => setFields(f=>f.map(x=>x.id===id?{...x,[k]:v}:x));

  const submit = () => {
    const evId=genId("EVT");
    const gatesObj=Object.fromEntries(gates.map(g=>[g.id,{name:g.name,color:g.color}]));
    const typesObj=Object.fromEntries(types.map(t=>[t.id,{name:t.name,price:parseInt(t.price)||0,qty:parseInt(t.qty)||100,color:t.color,perks:t.perksStr.split(",").map(s=>s.trim()).filter(Boolean)}]));
    const gKeys=Object.keys(gatesObj), tKeys=Object.keys(typesObj);
    const n=parseInt(count)||60;
    const tickets=Array.from({length:n},(_,i)=>{
      const tId=genId("TKT"),uId=genId("USR");
      const gId=gKeys[i%gKeys.length];
      const tpId=i<n*.2?tKeys[0]:i<n*.75?tKeys[1]:tKeys[2]||tKeys[tKeys.length-1];
      return {id:tId,evId,uId,gId,tpId,code:encodeTicket(evId,tId,uId),holderName:"",holderEmail:"",holderPhone:"",status:"unused",customData:{},registeredAt:new Date().toISOString()};
    });
    onSubmit({id:evId,orgId:org.id,...det,status:"upcoming",featured:false,checkinCount:0,gates:gatesObj,ticketTypes:typesObj,regFields:fields,tickets});
  };

  const STEPS = ["Details","Gates","Ticket Tiers","Reg Form"];
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
          <h2 style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:20}}>Event Details</h2>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Inp label="Event Title" value={det.title} onChange={setD("title")} required/>
            <Inp label="Description" type="textarea" value={det.desc} onChange={setD("desc")} rows={3}/>
            <div className="g2">
              <Inp label="Date" type="date" value={det.date} onChange={setD("date")} required/>
              <Inp label="Category" value={det.category} onChange={v=>{setD("category")(v);setD("banner")(v.toLowerCase().replace(/[^a-z]/g,"").slice(0,6)||"music");}}
                options={["Music","Technology","Food & Drinks","Arts","Sports","Fashion","Business"].map(v=>({value:v,label:v}))}/>
              <Inp label="Start Time" type="time" value={det.time} onChange={setD("time")}/>
              <Inp label="End Time" type="time" value={det.endTime} onChange={setD("endTime")}/>
            </div>
            <Inp label="Venue" value={det.venue} onChange={setD("venue")} required/>
            <div className="g2">
              <Inp label="City" value={det.city} onChange={setD("city")} options={["Lagos","Abuja","Port Harcourt","Kano","Ibadan","Enugu"].map(v=>({value:v,label:v}))}/>
              <Inp label="Tickets to Generate" type="number" value={count} onChange={setCount}/>
            </div>
          </div>
          <Btn full style={{marginTop:20}} onClick={()=>det.title&&det.date&&det.venue?setStep(2):null}>Next: Configure Gates <ChevronRight size={14}/></Btn>
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

      {step===3 && (
        <Card style={{padding:28}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <h2 style={{fontSize:17,fontWeight:700,color:T.text}}>Ticket Tiers</h2>
              <p style={{fontSize:13,color:T.muted,marginTop:4}}>3-tier pricing is pre-set: Early Bird / Regular / VIP. Edit as needed.</p>
            </div>
            <Btn sz="sm" onClick={addType} icon={<Plus size={13}/>}>Add Tier</Btn>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
            {types.map(t=>(
              <div key={t.id} style={{padding:18,borderRadius:14,border:`2px solid ${t.color+"40"}`,background:t.color+"08"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{display:"flex",gap:4}}>{COLORS.slice(0,6).map(col=><div key={col} onClick={()=>setType(t.id,"color",col)} style={{width:18,height:18,borderRadius:"50%",background:col,cursor:"pointer",border:t.color===col?"2px solid white":"2px solid transparent"}}/>)}</div>
                  {types.length>1 && <button onClick={()=>setTypes(tt=>tt.filter(x=>x.id!==t.id))} style={{background:"none",border:"none",color:T.danger,cursor:"pointer"}}><Trash2 size={14}/></button>}
                </div>
                <div className="g3 g2">
                  <Inp label="Name" value={t.name} onChange={v=>setType(t.id,"name",v)}/>
                  <Inp label="Price (₦)" type="number" value={t.price} onChange={v=>setType(t.id,"price",v)}/>
                  <Inp label="Qty" type="number" value={t.qty} onChange={v=>setType(t.id,"qty",v)}/>
                </div>
                <div style={{marginTop:10}}><Inp label="Perks (comma separated)" value={t.perksStr} onChange={v=>setType(t.id,"perksStr",v)} placeholder="Priority entry, Lounge access"/></div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}><Btn v="secondary" onClick={()=>setStep(2)}><ChevronLeft size={14}/>Back</Btn><Btn full onClick={()=>setStep(4)}>Next: Reg Form <ChevronRight size={14}/></Btn></div>
        </Card>
      )}

      {step===4 && (
        <Card style={{padding:28}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div><h2 style={{fontSize:17,fontWeight:700,color:T.text}}>Registration Form</h2><p style={{fontSize:13,color:T.muted,marginTop:4}}>Customize what you collect from attendees.</p></div>
            <Btn sz="sm" onClick={addField} icon={<Plus size={13}/>}>Add Field</Btn>
          </div>
          <div style={{fontSize:12,color:T.muted,padding:"6px 0 14px"}}>First 3 are standard defaults (Name, Email, Phone)</div>
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
          <div style={{display:"flex",gap:10}}><Btn v="secondary" onClick={()=>setStep(3)}><ChevronLeft size={14}/>Back</Btn><Btn full v="gold" onClick={submit}><Sparkles size={14}/>Create Event & Generate Tickets</Btn></div>
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
