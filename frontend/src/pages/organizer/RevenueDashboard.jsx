import { Calendar, DollarSign, UserCheck } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Card, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { exportAttendees, exportScanLog } from "../../utils/export.js";

export default function RevenueDashboard({ events, orgId }) {
  const { mobile } = useMedia();
  const myEvs = events.filter(e=>!orgId||e.orgId===orgId);

  // Build revenue data per event
  const data = myEvs.map(ev=>{
    const bars = Object.entries(ev.ticketTypes).map(([tid,t])=>{
      const sold = ev.tickets.filter(tk=>tk.tpId===tid&&tk.status==="used").length;
      return { name:t.name, color:t.color, revenue:sold*t.price, count:sold, price:t.price };
    });
    return { evId:ev.id, label:ev.title.length>18?ev.title.slice(0,16)+"…":ev.title, bars, total:bars.reduce((s,b)=>s+b.revenue,0) };
  });

  const maxRev   = Math.max(...data.map(d=>d.total), 1);
  const totalRev = data.reduce((s,d)=>s+d.total, 0);
  const totalIn  = myEvs.reduce((s,e)=>s+e.tickets.filter(t=>t.status==="used").length, 0);
  const allTypeNames = [...new Set(myEvs.flatMap(ev=>Object.values(ev.ticketTypes).map(t=>t.name)))];
  const typeColorMap = myEvs.flatMap(ev=>Object.values(ev.ticketTypes)).reduce((acc,t)=>({...acc,[t.name]:t.color}),{});

  const BAR_W = mobile ? 34 : 50;
  const GAP   = mobile ? 18 : 30;
  const CH    = 180; // chart height
  const CW    = data.length*(BAR_W+GAP)+GAP;

  return (
    <div style={{maxWidth:1200,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text,marginBottom:4}}>Revenue Dashboard</h1>
      <p style={{color:T.muted,marginBottom:28}}>Revenue breakdown by event and ticket tier</p>

      <div className="g3" style={{marginBottom:32}}>
        <StatCard label="Total Revenue" value={`₦${(totalRev/1000000).toFixed(1)}M`} icon={DollarSign} color={T.gold} sub={`₦${totalRev.toLocaleString()}`}/>
        <StatCard label="Events Tracked" value={myEvs.length} icon={Calendar} color={T.accent}/>
        <StatCard label="Tickets Checked In" value={totalIn} icon={UserCheck} color={T.success}/>
      </div>

      {/* Stacked bar chart */}
      <Card style={{padding:mobile?16:28,marginBottom:24}}>
        <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:6}}>Revenue by Event & Tier</h3>
        <p style={{fontSize:12,color:T.muted,marginBottom:20}}>Each bar segment = revenue from that ticket tier. Hover for details.</p>

        {data.length===0
          ? <p style={{color:T.muted,textAlign:"center",padding:40}}>No revenue data yet. Check in some attendees.</p>
          : (
            <div style={{overflowX:"auto"}}>
              <svg viewBox={`0 0 ${Math.max(CW,380)} ${CH+70}`} style={{width:"100%",minWidth:300}}>
                {/* Grid lines */}
                {[0,.25,.5,.75,1].map((p,i)=>{
                  const y=p*CH;
                  const label=`₦${((1-p)*maxRev/1000).toFixed(0)}k`;
                  return (
                    <g key={i}>
                      <line x1={0} y1={y} x2={CW} y2={y} stroke={T.border} strokeWidth={1}/>
                      <text x={2} y={y-3} fill={T.muted} fontSize={9}>{label}</text>
                    </g>
                  );
                })}
                {/* Bars */}
                {data.map((d,i)=>{
                  const x=GAP+i*(BAR_W+GAP);
                  let y=CH;
                  return (
                    <g key={d.evId}>
                      {d.bars.map((b,j)=>{
                        const h=maxRev?(b.revenue/maxRev)*CH:0;
                        if (h<1) return null;
                        y-=h;
                        const isTop = j===0||!d.bars.slice(0,j).some(prev=>prev.revenue>0);
                        return (
                          <g key={j}>
                            <rect x={x} y={y} width={BAR_W} height={h}
                              fill={b.color} rx={isTop?4:0}/>
                            <title>₦{b.revenue.toLocaleString()} · {b.name} ({b.count} tickets @ ₦{b.price.toLocaleString()})</title>
                          </g>
                        );
                      })}
                      {/* Label */}
                      <text x={x+BAR_W/2} y={CH+14} textAnchor="middle" fill={T.muted} fontSize={9}>{d.label}</text>
                      <text x={x+BAR_W/2} y={CH+28} textAnchor="middle" fill={T.gold} fontSize={10} fontWeight="700">
                        ₦{(d.total/1000).toFixed(0)}k
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )
        }

        {/* Legend */}
        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:16}}>
          {allTypeNames.map(name=>(
            <div key={name} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:12,height:12,borderRadius:3,background:typeColorMap[name]||T.muted}}/>
              <span style={{fontSize:12,color:T.muted}}>{name}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Per-event breakdown cards */}
      <div className="ga">
        {data.map(d=>{
          const ev = myEvs.find(e=>e.id===d.evId);
          return (
            <Card key={d.evId} style={{padding:20}}>
              <h4 style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14,lineHeight:1.3}}>{ev?.title}</h4>
              {d.bars.map((b,i)=>(
                <div key={i} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:T.muted}}>{b.name} · {b.count} sold</span>
                    <span style={{fontSize:12,fontWeight:700,color:b.color}}>₦{b.revenue.toLocaleString()}</span>
                  </div>
                  <div style={{height:5,borderRadius:100,background:T.border}}>
                    <div style={{height:"100%",borderRadius:100,background:b.color,width:`${d.total?(b.revenue/d.total)*100:0}%`,transition:"width 1s"}}/>
                  </div>
                </div>
              ))}
              <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10,marginTop:4}}>
                <p style={{fontSize:14,fontWeight:800,color:T.gold}}>Total: ₦{d.total.toLocaleString()}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   25. SCAN SESSION LOG  —  timestamped with export
───────────────────────────────────────────────────────────── */
