import { BarChart3, Bell, Building, ChevronRight, DollarSign, List, MessageCircle, Scan, Ticket, Zap } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Bdg, Btn, Card, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";

export default function AdminDash({ organizers, events, scanLogs, onNav }) {
  const { mobile } = useMedia();
  const pending   = organizers.filter(o=>o.status==="pending").length;
  const approved  = organizers.filter(o=>o.status==="approved").length;
  const totalT    = events.reduce((s,e)=>s+e.tickets.length, 0);
  const totalIn   = events.reduce((s,e)=>s+e.tickets.filter(t=>t.status==="used").length, 0);
  const totalRev  = events.reduce((s,ev)=>s+Object.entries(ev.ticketTypes).reduce((r,[tid,t])=>r+ev.tickets.filter(tk=>tk.tpId===tid&&tk.status==="used").length*t.price,0),0);
  const totalScans = scanLogs.length;
  const admitted  = scanLogs.filter(l=>l.status==="admitted").length;
  const rejected  = scanLogs.filter(l=>l.status==="rejected"||l.status==="wrong_gate").length;
  const dupes     = scanLogs.filter(l=>l.status==="duplicate").length;

  // Revenue per organizer
  const orgRevenue = organizers.map(org=>{
    const orgEvs = events.filter(e=>e.orgId===org.id);
    const rev = orgEvs.reduce((s,ev)=>s+Object.entries(ev.ticketTypes).reduce((r,[tid,t])=>r+ev.tickets.filter(tk=>tk.tpId===tid&&tk.status==="used").length*t.price,0),0);
    return { ...org, revenue:rev, events:orgEvs.length, tickets:orgEvs.reduce((s,e)=>s+e.tickets.length,0) };
  }).sort((a,b)=>b.revenue-a.revenue);

  // Top events by check-in rate
  const topEvents = [...events]
    .map(ev=>({...ev, pct:ev.tickets.length?Math.round(ev.tickets.filter(t=>t.status==="used").length/ev.tickets.length*100):0}))
    .sort((a,b)=>b.pct-a.pct).slice(0,5);

  // Platform revenue mini chart — last 30 days bucketed by event date
  const scanRate = totalScans?Math.round(admitted/totalScans*100):0;

  return (
    <div style={{maxWidth:1280,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:14}}>
        <div>
          <h1 className="outfit" style={{fontSize:26,fontWeight:800,color:T.text,marginBottom:4}}>Admin Dashboard</h1>
          <p style={{color:T.muted}}>Platform overview · {new Date().toLocaleDateString("en-NG",{dateStyle:"long"})}</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn sz="sm" v="secondary" onClick={()=>onNav("admin-orgs")}><Building size={13}/>Organizers</Btn>
          <Btn sz="sm" v="secondary" onClick={()=>onNav("admin-revenue")}><BarChart3 size={13}/>Revenue</Btn>
          <Btn sz="sm" v="secondary" onClick={()=>onNav("admin-scan-log")}><List size={13}/>Scan Logs</Btn>
          <Btn sz="sm" v="secondary" onClick={()=>onNav("email-blast")}><Zap size={13}/>Email Blast</Btn>
          <Btn sz="sm" onClick={()=>onNav("whatsapp-blast")}><MessageCircle size={13}/>WhatsApp</Btn>
        </div>
      </div>

      {/* Pending alert */}
      {pending>0 && (
        <Card style={{padding:18,marginBottom:24,border:`1px solid ${T.gold+"50"}`,background:T.gold+"0a"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,borderRadius:12,background:T.gold+"20",display:"flex",alignItems:"center",justifyContent:"center"}}><Bell size={18} style={{color:T.gold}}/></div>
              <div>
                <p style={{fontWeight:700,color:T.gold,fontSize:14}}>⚠️ {pending} Application{pending!==1?"s":""} Awaiting Review</p>
                <p style={{fontSize:12,color:T.muted,marginTop:2}}>Organizers are waiting for approval before they can go live</p>
              </div>
            </div>
            <Btn sz="sm" onClick={()=>onNav("admin-orgs")}>Review Now <ChevronRight size={13}/></Btn>
          </div>
        </Card>
      )}

      {/* KPI grid */}
      <div className="g4" style={{marginBottom:28}}>
        <StatCard label="Platform Revenue" value={`₦${(totalRev/1000000).toFixed(2)}M`} icon={DollarSign} color={T.gold} sub={`₦${totalRev.toLocaleString()} total`}/>
        <StatCard label="Total Tickets" value={totalT.toLocaleString()} icon={Ticket} color={T.accent} sub={`${totalIn} checked in`}/>
        <StatCard label="Active Organizers" value={approved} icon={Building} color={T.success} sub={`${pending} pending`}/>
        <StatCard label="Total Scans" value={totalScans} icon={Scan} color={T.info} sub={`${scanRate}% success rate`}/>
      </div>

      {/* Middle row */}
      <div className="g2" style={{marginBottom:24}}>
        {/* Scan breakdown */}
        <Card style={{padding:24}}>
          <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:4}}>Platform Scan Summary</h3>
          <p style={{fontSize:12,color:T.muted,marginBottom:16}}>All-time scan outcomes across all events</p>
          {[["✅ Admitted",admitted,T.success],[" ❌ Rejected / Wrong Gate",rejected,T.danger],["⚠️ Duplicate Attempts",dupes,T.warn]].map(([l,v,c],i)=>{
            const pct=totalScans?Math.round(v/totalScans*100):0;
            return (
              <div key={i} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:13,color:T.text}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:c}}>{v} <span style={{color:T.muted,fontWeight:400,fontSize:11}}>({pct}%)</span></span>
                </div>
                <div style={{height:5,borderRadius:100,background:T.border}}>
                  <div style={{height:"100%",borderRadius:100,background:c,width:`${pct}%`,transition:"width .8s"}}/>
                </div>
              </div>
            );
          })}
          <Btn full sz="sm" v="secondary" style={{marginTop:8}} onClick={()=>onNav("admin-scan-log")}>View Full Scan Log →</Btn>
        </Card>

        {/* Top events */}
        <Card style={{padding:24}}>
          <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:4}}>Top Events by Check-in Rate</h3>
          <p style={{fontSize:12,color:T.muted,marginBottom:16}}>Events ranked by % of tickets scanned</p>
          {topEvents.map((ev,i)=>{
            const used=ev.tickets.filter(t=>t.status==="used").length;
            const orgName=organizers.find(o=>o.id===ev.orgId)?.name||"—";
            return (
              <div key={ev.id} style={{display:"flex",gap:10,alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
                <span style={{fontSize:13,fontWeight:800,color:T.muted,width:20}}>{i+1}</span>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</p>
                  <p style={{fontSize:11,color:T.muted}}>{orgName} · {used}/{ev.tickets.length} scanned</p>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <p style={{fontSize:13,fontWeight:800,color:ev.pct>75?T.success:ev.pct>40?T.gold:T.muted}}>{ev.pct}%</p>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Organizer performance table */}
      <Card style={{padding:24,marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:15,fontWeight:700,color:T.text}}>Organizer Performance</h3>
          <Btn sz="xs" v="secondary" onClick={()=>onNav("admin-orgs")}>Manage All</Btn>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",minWidth:560}}>
            <thead>
              <tr style={{background:T.surface,borderBottom:`1px solid ${T.border}`}}>
                {["Organizer","Status","Events","Tickets","Revenue","Actions"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em",textAlign:"left"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgRevenue.map((org,i)=>(
                <tr key={org.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?"transparent":T.subtle+"60"}}>
                  <td style={{padding:"12px 14px"}}>
                    <p style={{fontSize:13,fontWeight:700,color:T.text}}>{org.name}</p>
                    <p style={{fontSize:11,color:T.muted}}>{org.contactName}</p>
                  </td>
                  <td style={{padding:"12px 14px"}}><Bdg color={org.status==="approved"?"green":org.status==="pending"?"gold":"red"}>{org.status}</Bdg></td>
                  <td style={{padding:"12px 14px",fontSize:13,color:T.text}}>{org.events}</td>
                  <td style={{padding:"12px 14px",fontSize:13,color:T.text}}>{org.tickets}</td>
                  <td style={{padding:"12px 14px",fontSize:13,fontWeight:700,color:T.gold}}>₦{(org.revenue/1000).toFixed(0)}k</td>
                  <td style={{padding:"12px 14px"}}>
                    <div style={{display:"flex",gap:6}}>
                      <Btn sz="xs" v="secondary" onClick={()=>onNav("admin-orgs")}>View</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent scans feed */}
      <Card style={{padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:15,fontWeight:700,color:T.text}}>Recent Platform Scans</h3>
          <Btn sz="xs" v="secondary" onClick={()=>onNav("admin-scan-log")}>Full Log</Btn>
        </div>
        {scanLogs.length===0
          ? <p style={{color:T.muted,fontSize:13,textAlign:"center",padding:20}}>No scan activity yet.</p>
          : [...scanLogs].sort((a,b)=>b.ts-a.ts).slice(0,8).map((log,i)=>{
              const col={admitted:T.success,rejected:T.danger,duplicate:T.warn,wrong_gate:T.warn}[log.status]||T.muted;
              return (
                <div key={log.id} style={{display:"flex",gap:10,alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,color:T.text,fontWeight:600}}>{log.holderName||"Unknown"} <span style={{color:T.muted,fontWeight:400}}>@ {log.gateName}</span></p>
                    <p style={{fontSize:11,color:T.muted}}>{log.evTitle} · {log.staffName||"System"}</p>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <span style={{fontSize:11,padding:"2px 8px",borderRadius:100,background:col+"20",color:col,fontWeight:700,textTransform:"capitalize"}}>{log.status}</span>
                    <p style={{fontSize:10,color:T.muted,marginTop:3}}>{new Date(log.ts).toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"})}</p>
                  </div>
                </div>
              );
            })
        }
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   20b. ADMIN REVENUE  —  platform-wide breakdown
───────────────────────────────────────────────────────────── */
