import { Building, DollarSign, UserCheck } from "lucide-react";
import { EVENT_BANNERS, T } from "../../styles/theme.js";
import { Bdg, Card, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { exportAttendees, exportScanLog } from "../../utils/export.js";

export default function AdminRevenue({ organizers, events }) {
  const { mobile } = useMedia();

  const data = organizers.map(org=>{
    const orgEvs = events.filter(e=>e.orgId===org.id);
    const bars = orgEvs.map(ev=>{
      const rev = Object.entries(ev.ticketTypes).reduce((s,[tid,t])=>s+ev.tickets.filter(tk=>tk.tpId===tid&&tk.status==="used").length*t.price,0);
      const sold = ev.tickets.filter(t=>t.status==="used").length;
      return { name:ev.title.length>16?ev.title.slice(0,14)+"…":ev.title, color:EVENT_BANNERS[ev.banner]?.split(",")[1]?.trim().replace(/[^#0-9a-fA-F]/g,"")||T.accent, revenue:rev, sold, total:ev.tickets.length };
    });
    const total = bars.reduce((s,b)=>s+b.revenue,0);
    return { orgId:org.id, orgName:org.name, bars, total, status:org.status };
  }).filter(d=>d.bars.length>0).sort((a,b)=>b.total-a.total);

  const grandTotal = data.reduce((s,d)=>s+d.total,0);
  const totalIn    = events.reduce((s,e)=>s+e.tickets.filter(t=>t.status==="used").length,0);

  const maxRev = Math.max(...data.map(d=>d.total), 1);
  const BAR_W  = mobile?32:44, GAP=mobile?16:24, CH=160;
  const allBars = data.flatMap(d=>d.bars);
  const CW     = allBars.length*(BAR_W+GAP)+GAP;

  // Color palette for events
  const PALETTE = [T.accent,T.gold,T.success,T.info,T.warn,"#ec4899","#06b6d4","#84cc16"];

  return (
    <div style={{maxWidth:1280,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text,marginBottom:4}}>Platform Revenue</h1>
      <p style={{color:T.muted,marginBottom:28}}>Revenue breakdown across all organizers and events</p>

      <div className="g3" style={{marginBottom:28}}>
        <StatCard label="Total Platform Revenue" value={`₦${(grandTotal/1000000).toFixed(2)}M`} icon={DollarSign} color={T.gold} sub={`₦${grandTotal.toLocaleString()}`}/>
        <StatCard label="Total Check-ins" value={totalIn.toLocaleString()} icon={UserCheck} color={T.success}/>
        <StatCard label="Organizers Earning" value={data.filter(d=>d.total>0).length} icon={Building} color={T.accent}/>
      </div>

      {/* Stacked bar chart per-event */}
      <Card style={{padding:mobile?16:28,marginBottom:24}}>
        <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:4}}>Revenue per Event (All Organizers)</h3>
        <p style={{fontSize:12,color:T.muted,marginBottom:20}}>Each bar = one event. Hover for details.</p>
        {allBars.length===0
          ? <p style={{color:T.muted,textAlign:"center",padding:40}}>No revenue data yet.</p>
          : (
            <div style={{overflowX:"auto"}}>
              <svg viewBox={`0 0 ${Math.max(CW,360)} ${CH+60}`} style={{width:"100%",minWidth:280}}>
                {[0,.25,.5,.75,1].map((p,i)=>{
                  const y=p*CH;
                  return (
                    <g key={i}>
                      <line x1={0} y1={y} x2={CW} y2={y} stroke={T.border} strokeWidth={1}/>
                      <text x={2} y={y-3} fill={T.muted} fontSize={9}>₦{((1-p)*maxRev/1000).toFixed(0)}k</text>
                    </g>
                  );
                })}
                {allBars.map((b,i)=>{
                  const x=GAP+i*(BAR_W+GAP);
                  const h=maxRev?(b.revenue/maxRev)*CH:0;
                  const col=PALETTE[i%PALETTE.length];
                  return (
                    <g key={i}>
                      {h>0 && <rect x={x} y={CH-h} width={BAR_W} height={h} fill={col} rx={3}/>}
                      <text x={x+BAR_W/2} y={CH+14} textAnchor="middle" fill={T.muted} fontSize={8}>{b.name}</text>
                      <text x={x+BAR_W/2} y={CH+28} textAnchor="middle" fill={T.gold} fontSize={9} fontWeight="700">₦{(b.revenue/1000).toFixed(0)}k</text>
                      <title>{b.name} — ₦{b.revenue.toLocaleString()} ({b.sold}/{b.total} sold)</title>
                    </g>
                  );
                })}
              </svg>
            </div>
          )
        }
      </Card>

      {/* Per-organizer breakdown */}
      <div className="ga">
        {data.map((d,oi)=>(
          <Card key={d.orgId} style={{padding:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <h4 style={{fontSize:14,fontWeight:700,color:T.text}}>{d.orgName}</h4>
                <Bdg color={d.status==="approved"?"green":"gold"}>{d.status}</Bdg>
              </div>
              <p className="outfit" style={{fontSize:20,fontWeight:800,color:T.gold}}>₦{(d.total/1000).toFixed(0)}k</p>
            </div>
            {d.bars.map((b,i)=>(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:8}}>{b.name}</span>
                  <span style={{fontSize:12,fontWeight:700,color:PALETTE[(oi*3+i)%PALETTE.length],flexShrink:0}}>₦{(b.revenue/1000).toFixed(0)}k</span>
                </div>
                <div style={{height:4,borderRadius:100,background:T.border}}>
                  <div style={{height:"100%",borderRadius:100,background:PALETTE[(oi*3+i)%PALETTE.length],width:`${d.total?(b.revenue/d.total)*100:0}%`,transition:"width .8s"}}/>
                </div>
                <p style={{fontSize:10,color:T.muted,marginTop:2}}>{b.sold} checked in / {b.total} total</p>
              </div>
            ))}
          </Card>
        ))}
        {data.length===0 && <Card style={{padding:60,textAlign:"center",gridColumn:"1/-1"}}><p style={{color:T.muted}}>No revenue data yet.</p></Card>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   20c. ADMIN SCAN LOG  —  all events, all organizers
───────────────────────────────────────────────────────────── */
