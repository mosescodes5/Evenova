import { useEffect, useState } from "react";
import { CheckCircle, Clock, DollarSign, Ticket, UserCheck } from "lucide-react";
import { GA, T } from "../../styles/theme.js";
import { Bdg, Card, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";

export default function LiveDashboard({ events, orgId }) {
  const { mobile } = useMedia();
  const myEvs = events.filter(e=>!orgId||e.orgId===orgId);
  const [selId, setSelId] = useState(myEvs[0]?.id||"");
  useEffect(()=>{ const i=setInterval(()=>{},2500); return()=>clearInterval(i); },[]);

  const ev=myEvs.find(e=>e.id===selId);
  if(!ev) return <div style={{padding:40,textAlign:"center",color:T.muted}}>No events.</div>;

  const used=ev.tickets.filter(t=>t.status==="used").length;
  const total=ev.tickets.length;
  const pct=total?Math.round(used/total*100):0;
  const gateData=Object.entries(ev.gates).map(([id,g])=>({id,...g,used:ev.tickets.filter(t=>t.gId===id&&t.status==="used").length,total:ev.tickets.filter(t=>t.gId===id).length}));
  const revenue=Object.entries(ev.ticketTypes).reduce((s,[tid,t])=>s+ev.tickets.filter(tk=>tk.tpId===tid&&tk.status==="used").length*t.price,0);
  const hBars=[0,0,1,2,3,5,8,12,20,24,18,12,8,4,2,1].map((v,i)=>({h:`${i+7}`,v}));
  const maxH=Math.max(...hBars.map(d=>d.v));

  return (
    <div style={{maxWidth:1200,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:24}}>
        <div>
          <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text}}>Live Dashboard</h1>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
            <div className="live-dot" style={{width:8,height:8,borderRadius:"50%",background:T.success}}/>
            <span style={{fontSize:12,color:T.muted}}>Live · auto-refreshing</span>
          </div>
        </div>
        <select value={selId} onChange={e=>setSelId(e.target.value)}
          style={{padding:"10px 14px",borderRadius:12,background:T.surface,border:`1px solid ${T.border}`,color:T.text,fontSize:13}}>
          {myEvs.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      <div className="g4" style={{marginBottom:24}}>
        <StatCard label="Total Tickets" value={total} icon={Ticket} color={T.accent}/>
        <StatCard label="Checked In" value={used} icon={UserCheck} color={T.success}/>
        <StatCard label="Remaining" value={total-used} icon={Clock} color={T.gold}/>
        <StatCard label="Revenue" value={`₦${(revenue/1000).toFixed(0)}k`} icon={DollarSign} color={T.gold}/>
      </div>

      <div className="g2" style={{marginBottom:20}}>
        {/* Timeline */}
        <Card style={{padding:24}}>
          <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:16}}>Entry Timeline</h3>
          <div style={{display:"flex",alignItems:"flex-end",gap:3,height:110}}>
            {hBars.map((d,i)=>(
              <div key={i} style={{flex:1,borderRadius:"3px 3px 0 0",
                background:d.v===maxH?GA:T.accent+"44",
                height:`${maxH?(d.v/maxH)*100:0}%`,minHeight:d.v?3:2,transition:"height 1s"}}
                title={`${d.h}:00 — ${d.v} entries`}/>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.muted,marginTop:4}}>
            <span>7:00</span><span>Peak: 15:00</span><span>23:00</span>
          </div>
        </Card>

        {/* Donut */}
        <Card style={{padding:24,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <svg viewBox="0 0 140 140" width={140} height={140}>
            <circle cx="70" cy="70" r="56" fill="none" stroke={T.border} strokeWidth="13"/>
            <circle cx="70" cy="70" r="56" fill="none" stroke="url(#donut)" strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*56*pct/100} ${2*Math.PI*56*(1-pct/100)}`}
              strokeDashoffset={2*Math.PI*56*0.25}
              style={{transition:"stroke-dasharray .8s ease"}}/>
            <defs><linearGradient id="donut" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={T.accent}/><stop offset="100%" stopColor={T.accentL}/>
            </linearGradient></defs>
            <text x="70" y="65" textAnchor="middle" fill="white" fontSize="22" fontWeight="800">{pct}%</text>
            <text x="70" y="82" textAnchor="middle" fill={T.muted} fontSize="11">capacity</text>
          </svg>
          <p style={{fontSize:13,color:T.muted,marginTop:12}}>{used} of {total} checked in</p>
        </Card>
      </div>

      {/* Gate performance */}
      <h2 style={{fontSize:13,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".08em",marginBottom:14}}>Gate Performance</h2>
      <div className="ga" style={{marginBottom:20}}>
        {gateData.map(g=>{
          const gPct=g.total?Math.round(g.used/g.total*100):0;
          return (
            <Card key={g.id} style={{padding:18}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:g.color}}/>
                <span style={{fontSize:14,fontWeight:700,color:T.text}}>{g.name}</span>
              </div>
              <p className="outfit" style={{fontSize:22,fontWeight:800,color:g.color}}>
                {g.used}<span style={{fontSize:13,color:T.muted,fontWeight:400}}>/{g.total}</span>
              </p>
              <div style={{height:4,borderRadius:100,background:T.border,marginTop:8}}>
                <div style={{height:"100%",borderRadius:100,background:g.color,width:`${gPct}%`,transition:"width .8s"}}/>
              </div>
              <p style={{fontSize:11,color:T.muted,marginTop:5}}>{gPct}% of gate capacity</p>
            </Card>
          );
        })}
      </div>

      {/* Recent check-ins */}
      {used>0 && (
        <Card style={{padding:20}}>
          <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Recent Check-ins</h3>
          <div style={{maxHeight:240,overflowY:"auto"}}>
            {ev.tickets.filter(t=>t.status==="used").slice().reverse().slice(0,10).map((t,i)=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:T.success+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.success}}>{i+1}</div>
                <span style={{fontSize:13,color:T.text,flex:1}}>{t.holderName||"Guest"}</span>
                <Bdg color="gray">{ev.ticketTypes[t.tpId]?.name}</Bdg>
                <span style={{fontSize:12,color:T.muted}}>{ev.gates[t.gId]?.name}</span>
                <CheckCircle size={13} style={{color:T.success}}/>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   29. MAIN APP
───────────────────────────────────────────────────────────── */
