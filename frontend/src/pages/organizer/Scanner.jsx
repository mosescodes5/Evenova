import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, Download, RefreshCw, Scan, Ticket, Wifi, WifiOff } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Bdg, Btn, Card, Inp } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { genId, encodeTicket, verifyQR } from "../../utils/crypto.js";
import { sendEmail, sendTicketEmail } from "../../utils/email.js";

export default function Scanner({ events, scanned, offlineMode, onToggleOffline, onScan, onCacheDownload, orgId, user }) {
  const { mobile } = useMedia();
  const [input, setInput] = useState(""), [result, setResult] = useState(null);
  const [selEvId, setSelEvId] = useState(""), [selGateId, setSelGateId] = useState("");
  const [cacheLoaded, setCacheLoaded] = useState(false), [syncCount, setSyncCount] = useState(0);
  const inputRef = useRef(); const rTimer = useRef();

  const myEvs = events.filter(e=>!orgId||e.orgId===orgId);
  useEffect(()=>{ if(myEvs.length){setSelEvId(myEvs[0].id);setSelGateId(Object.keys(myEvs[0].gates)[0]||"all");} },[]);
  useEffect(()=>{ if(inputRef.current)inputRef.current.focus(); },[]);

  const ev   = myEvs.find(e=>e.id===selEvId);
  const gate = ev?.gates[selGateId];

  const showRes = useCallback(r=>{
    setResult(r);
    clearTimeout(rTimer.current);
    rTimer.current=setTimeout(()=>setResult(null),3500);
  },[]);

  const handleScan = useCallback((code)=>{
    const clean=(code||"").trim();
    if(!clean||!ev)return;
    setInput(""); if(inputRef.current)inputRef.current.focus();

    const v=verifyQR(clean);
    if(!v.ok){
      showRes({ok:false,icon:"❌",title:"INVALID SIGNATURE",sub:v.reason,color:T.danger});
      onScan(null,"rejected",v.reason,selGateId,gate,ev,user);
      return;
    }
    if(v.eId!==ev.id){
      showRes({ok:false,icon:"⚠️",title:"WRONG EVENT",sub:"Ticket belongs to a different event.",color:T.warn});
      onScan(null,"wrong_event","Different event",selGateId,gate,ev,user);
      return;
    }
    const ticket=ev.tickets.find(t=>t.id===v.tId);
    if(!ticket){
      showRes({ok:false,icon:"⚠️",title:"NOT FOUND",sub:"Ticket not in database.",color:T.danger});
      onScan(null,"rejected","Not found",selGateId,gate,ev,user);
      return;
    }
    const key=`${ev.id}:${ticket.id}`;
    if(scanned[key]){
      showRes({ok:false,icon:"🚫",title:"ALREADY USED",sub:`Checked in at ${ev.gates[ticket.gId]?.name}`,color:T.warn});
      onScan(ticket,"duplicate","Already scanned",selGateId,gate,ev,user);
      return;
    }
    if(ticket.gId!==selGateId&&selGateId!=="all"){
      showRes({ok:false,icon:"🚧",title:"WRONG GATE",sub:`This ticket is for: ${ev.gates[ticket.gId]?.name}`,color:T.warn});
      onScan(ticket,"wrong_gate",`Belongs to ${ev.gates[ticket.gId]?.name}`,selGateId,gate,ev,user);
      return;
    }
    onScan(ticket,"admitted","",selGateId,gate,ev,user);
    const tp=ev.ticketTypes[ticket.tpId];
    showRes({ok:true,icon:"✅",title:"ADMITTED",sub:`${ticket.holderName||"Guest"} · ${tp?.name} · ${gate?.name||"All Gates"}`,color:T.success});
  },[ev,selGateId,scanned,gate,user,onScan,showRes]);

  const offlineCount=ev?ev.tickets.filter(t=>t.gId===selGateId||selGateId==="all").length:0;

  return (
    <div style={{maxWidth:540,margin:"0 auto",padding:mobile?"16px":"28px 24px"}}>
      <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text,marginBottom:4}}>QR Scanner</h1>
      <p style={{color:T.muted,fontSize:14,marginBottom:20}}>Cryptographic ticket verification — online & offline</p>

      {/* Online/Offline toggle */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:14,borderRadius:14,
        border:`1px solid ${offlineMode?T.danger+"40":T.success+"40"}`,
        background:offlineMode?T.danger+"10":T.success+"10",marginBottom:16}}>
        {offlineMode?<WifiOff size={16} style={{color:T.danger}}/>:<Wifi size={16} style={{color:T.success}}/>}
        <div style={{flex:1}}>
          <p style={{fontSize:13,fontWeight:700,color:offlineMode?T.danger:T.success}}>{offlineMode?"OFFLINE MODE":"ONLINE MODE"}</p>
          <p style={{fontSize:11,color:T.muted}}>{offlineMode?"Validating from local cache":"Real-time server verification"}</p>
        </div>
        <button onClick={onToggleOffline} style={{padding:"5px 12px",borderRadius:100,fontSize:12,fontWeight:700,border:`1px solid ${T.border}`,background:T.surface,color:T.muted,cursor:"pointer"}}>Switch</button>
      </div>

      {/* Config */}
      <div className="g2" style={{marginBottom:12}}>
        <Inp label="Event" value={selEvId} onChange={v=>{setSelEvId(v);const e=myEvs.find(x=>x.id===v);if(e)setSelGateId(Object.keys(e.gates)[0]||"all");}}
          options={myEvs.map(e=>({value:e.id,label:e.title.slice(0,28)}))}/>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",display:"block",marginBottom:5}}>Gate</label>
          <select value={selGateId} onChange={e=>setSelGateId(e.target.value)}
            style={{width:"100%",padding:"10px 14px",borderRadius:10,fontSize:14,color:T.text,background:T.surface,border:`1px solid ${T.border}`}}>
            <option value="all">All Gates</option>
            {ev&&Object.entries(ev.gates).map(([id,g])=><option key={id} value={id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {gate && (
        <div style={{padding:"9px 14px",borderRadius:12,background:gate.color+"15",border:`1px solid ${gate.color+"30"}`,display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:gate.color}}/>
          <span style={{fontSize:13,fontWeight:700,color:gate.color}}>Scanning at: {gate.name}</span>
        </div>
      )}

      {/* Offline cache */}
      {offlineMode && (
        <Card style={{padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:T.text}}>Local Ticket Cache</p>
              <p style={{fontSize:11,color:T.muted}}>{cacheLoaded?`${offlineCount} tickets loaded`:"Download before going offline"}</p>
            </div>
            <Btn sz="sm" v={cacheLoaded?"secondary":"primary"} onClick={()=>{onCacheDownload(selEvId);setCacheLoaded(true);}}>
              <Download size={13}/>{cacheLoaded?"Re-sync":"Download"}
            </Btn>
          </div>
          {cacheLoaded && (
            <div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid ${T.border}`,paddingTop:8}}>
              <span style={{fontSize:11,color:T.muted}}>⚡ {offlineCount} tickets cached</span>
              <button onClick={()=>setSyncCount(c=>c+1)} style={{fontSize:11,color:T.accentL,background:"none",border:"none",cursor:"pointer"}}>
                <RefreshCw size={11} style={{display:"inline",marginRight:4}}/>Sync ({syncCount})
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Scan result */}
      {result && (
        <div style={{padding:24,borderRadius:18,border:`2px solid ${result.color+"55"}`,background:result.color+"12",textAlign:"center",marginBottom:16,animation:"fadeUp .2s ease"}}>
          <div style={{fontSize:44,marginBottom:6}}>{result.icon}</div>
          <h2 className="outfit" style={{fontSize:22,fontWeight:900,color:result.color}}>{result.title}</h2>
          <p style={{fontSize:14,color:T.muted,marginTop:6}}>{result.sub}</p>
        </div>
      )}

      {/* Input */}
      <Card style={{padding:22,marginBottom:14}}>
        <label style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",display:"block",marginBottom:10}}>Scan QR Code</label>
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>(e.key==="Enter"||e.key==="Tab")&&handleScan(input)}
          placeholder="PDA / scanner pastes here automatically…"
          style={{width:"100%",padding:"13px 16px",borderRadius:12,background:T.surface,border:`1px solid ${T.accent+"50"}`,color:T.gold,fontSize:12,fontFamily:"monospace"}}/>
        <p style={{fontSize:11,color:T.muted,marginTop:8}}>PDA / Zebra / Honeywell auto-submit on scan. Or paste and press Enter.</p>
        <Btn full style={{marginTop:14}} onClick={()=>handleScan(input)}>Verify Ticket</Btn>

        {ev && (
          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${T.border}`}}>
            <p style={{fontSize:11,color:T.muted,marginBottom:8}}>Test with a real unused ticket:</p>
            {ev.tickets.filter(t=>t.status==="unused").slice(0,2).map(t=>(
              <button key={t.id} onClick={()=>setInput(t.code)}
                style={{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",color:T.accentL+"80",fontSize:11,fontFamily:"monospace",cursor:"pointer",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {t.code.slice(0,55)}…
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Recent check-ins */}
      {ev && ev.checkinCount>0 && (
        <Card style={{padding:16}}>
          <p style={{fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:12}}>Recent Check-ins ({ev.checkinCount})</p>
          <div style={{maxHeight:180,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
            {ev.tickets.filter(t=>t.status==="used").slice(-6).reverse().map((t,i)=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10}}>
                <CheckCircle size={13} style={{color:T.success,flexShrink:0}}/>
                <span style={{fontSize:13,color:T.text,flex:1}}>{t.holderName||"Guest"}</span>
                <Bdg color="gray">{ev.ticketTypes[t.tpId]?.name}</Bdg>
                <span style={{fontSize:11,color:T.muted}}>{ev.gates[t.gId]?.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   28. LIVE DASHBOARD
───────────────────────────────────────────────────────────── */
