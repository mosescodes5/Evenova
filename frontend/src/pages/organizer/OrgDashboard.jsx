import { useMemo, useState } from "react";
import { Activity, Calendar, CheckCircle, Copy, DollarSign, Eye, Globe, Plus, Scan, Search, Settings, Ticket } from "lucide-react";
import { EVENT_BANNERS, GA, T } from "../../styles/theme.js";
import { Bdg, Btn, Card, Inp, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";

const STATUS_OPTS = ["All","Upcoming","Ongoing","Past"];

function statusOf(ev) {
  const now = Date.now();
  const start = new Date(ev.date + " " + (ev.time || "00:00")).getTime();
  const end   = ev.endTime ? new Date(ev.date + " " + ev.endTime).getTime() : start + 4*3600*1000;
  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "Ongoing";
  return "Past";
}

function statusColor(s) {
  if (s === "Upcoming") return T.info;
  if (s === "Ongoing")  return T.success;
  return T.muted;
}

export default function OrgDashboard({ org, events, onNav, notify }) {
  const { mobile } = useMedia();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const myEvs = events.filter(e=>e.orgId===org.id);
  const totalT    = myEvs.reduce((s,e)=>s+e.tickets.length, 0);
  const checkedIn = myEvs.reduce((s,e)=>s+e.tickets.filter(t=>t.status==="used").length, 0);
  const revenue   = myEvs.reduce((s,ev)=>s+Object.entries(ev.ticketTypes).reduce((r,[tid,t])=>
    r+ev.tickets.filter(tk=>tk.tpId===tid&&tk.status==="used").length*t.price, 0), 0);

  const filtered = useMemo(() => myEvs.filter(ev => {
    const matchSearch = !search || ev.title.toLowerCase().includes(search.toLowerCase()) ||
      ev.venue?.toLowerCase().includes(search.toLowerCase()) ||
      ev.city?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || statusOf(ev) === filter;
    return matchSearch && matchFilter;
  }), [myEvs, search, filter]);

  return (
    <div style={{maxWidth:1200,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:14}}>
        <div>
          <h1 className="outfit" style={{fontSize:26,fontWeight:800,color:T.text}}>
            Welcome, {org.contactName.split(" ")[0]} 👋
          </h1>
          <p style={{color:T.muted,marginTop:4}}>{org.name} · {org.staff.length}/{org.teamSize} staff accounts</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn v="secondary" sz="sm" onClick={()=>onNav("account-settings")} icon={<Settings size={13}/>}>Settings</Btn>
          <Btn onClick={()=>onNav("create-event")} icon={<Plus size={15}/>}>Create Event</Btn>
        </div>
      </div>

      {/* KPI row */}
      <div className="g4" style={{marginBottom:32}}>
        <StatCard label="Events" value={myEvs.length} icon={Calendar} color={T.accent}/>
        <StatCard label="Tickets Sold" value={totalT} icon={Ticket} color={T.info}/>
        <StatCard label="Checked In" value={checkedIn} icon={CheckCircle} color={T.success}
          sub={totalT ? `${Math.round(checkedIn/totalT*100)}% attendance` : undefined}/>
        <StatCard label="Revenue" value={`₦${(revenue/1000).toFixed(0)}k`} icon={DollarSign} color={T.gold}
          sub={`₦${revenue.toLocaleString()}`}/>
      </div>

      {myEvs.length === 0
        ? (
          <Card style={{padding:60,textAlign:"center"}}>
            <Calendar size={40} style={{color:T.muted,margin:"0 auto 16px"}}/>
            <h3 style={{fontSize:18,fontWeight:700,color:T.muted,marginBottom:8}}>No events yet</h3>
            <p style={{color:T.muted,marginBottom:20,fontSize:14}}>Create your first event to start selling tickets.</p>
            <Btn onClick={()=>onNav("create-event")}>Create First Event</Btn>
          </Card>
        ) : (
          <>
            {/* Search + filter bar */}
            <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{flex:1,minWidth:200,position:"relative",display:"flex",alignItems:"center"}}>
                <Search size={14} style={{position:"absolute",left:12,color:T.muted,pointerEvents:"none"}}/>
                <input
                  value={search}
                  onChange={e=>setSearch(e.target.value)}
                  placeholder="Search events, venues, cities…"
                  style={{width:"100%",padding:"9px 14px 9px 34px",borderRadius:10,fontSize:13,
                    color:T.text,background:T.surface,border:`1px solid ${T.border}`,fontFamily:"inherit",outline:"none"}}
                  onFocus={e=>e.target.style.borderColor=T.accent}
                  onBlur={e=>e.target.style.borderColor=T.border}
                />
              </div>
              <div style={{display:"flex",gap:6}}>
                {STATUS_OPTS.map(s=>(
                  <button key={s} onClick={()=>setFilter(s)}
                    style={{padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:700,border:"none",
                      cursor:"pointer",transition:"all .15s",
                      background:filter===s?GA:"transparent",
                      color:filter===s?"white":T.muted,
                      boxShadow:filter===s?`0 0 12px ${T.accent}40`:"none",
                      outline:filter===s?"none":`1px solid ${T.border}`}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0
              ? (
                <Card style={{padding:40,textAlign:"center"}}>
                  <p style={{color:T.muted,fontSize:14}}>No events match your search.</p>
                  <button onClick={()=>{setSearch("");setFilter("All");}}
                    style={{color:T.accentL,background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,marginTop:8}}>
                    Clear filters
                  </button>
                </Card>
              ) : (
                <div className="ga">
                  {filtered.map(ev=>{
                    const used = ev.tickets.filter(t=>t.status==="used").length;
                    const pct  = ev.tickets.length ? Math.round(used/ev.tickets.length*100) : 0;
                    const link = `https://evenova.ng/e/${ev.id}`;
                    const evStatus = statusOf(ev);
                    return (
                      <Card key={ev.id} hover style={{overflow:"hidden"}}>
                        <div style={{height:110,background:EVENT_BANNERS[ev.banner]||EVENT_BANNERS[0],
                          display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"10px 12px"}}>
                          <Bdg color="purple">{ev.category}</Bdg>
                          <span style={{padding:"3px 9px",borderRadius:100,fontSize:10,fontWeight:800,
                            background:"rgba(0,0,0,.45)",color:statusColor(evStatus)}}>
                            ● {evStatus}
                          </span>
                        </div>
                        <div style={{padding:18}}>
                          <h3 style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:4,lineHeight:1.3}}>{ev.title}</h3>
                          <p style={{fontSize:12,color:T.muted,marginBottom:12}}>
                            {ev.date} · {Object.keys(ev.gates).length} gate{Object.keys(ev.gates).length!==1?"s":""} · {Object.keys(ev.ticketTypes).length} tier{Object.keys(ev.ticketTypes).length!==1?"s":""}
                          </p>

                          {/* Attendance bar */}
                          <div style={{height:4,borderRadius:100,background:T.border,marginBottom:6}}>
                            <div style={{height:"100%",borderRadius:100,background:GA,width:`${pct}%`,transition:"width .8s"}}/>
                          </div>
                          <p style={{fontSize:11,color:T.muted,marginBottom:12}}>
                            {used}/{ev.tickets.length} tickets · {pct}% checked in
                          </p>

                          {/* Revenue */}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                            padding:"7px 10px",borderRadius:8,background:T.surface,marginBottom:12}}>
                            <span style={{fontSize:11,color:T.muted}}>Revenue</span>
                            <span style={{fontSize:13,fontWeight:800,color:T.gold}}>
                              ₦{Object.entries(ev.ticketTypes).reduce((r,[tid,t])=>
                                r+ev.tickets.filter(tk=>tk.tpId===tid&&tk.status==="used").length*t.price, 0).toLocaleString()}
                            </span>
                          </div>

                          {/* Copy link */}
                          <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
                            <Globe size={11} style={{color:T.accent,flexShrink:0}}/>
                            <span style={{fontSize:10,color:T.muted,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{link}</span>
                            <button onClick={()=>{navigator.clipboard?.writeText(link);notify("Link copied!");}}
                              style={{background:"none",border:"none",cursor:"pointer",color:T.accentL,flexShrink:0,padding:0}}>
                              <Copy size={11}/>
                            </button>
                          </div>

                          <div style={{display:"flex",gap:6}}>
                            <Btn sz="xs" v="secondary" onClick={()=>onNav("event-detail",ev.id)} style={{flex:1}}><Eye size={11}/>Detail</Btn>
                            <Btn sz="xs" v="secondary" onClick={()=>onNav("scanner",ev.id)} style={{flex:1}}><Scan size={11}/>Scan</Btn>
                            <Btn sz="xs" v="secondary" onClick={()=>onNav("live",ev.id)} style={{flex:1}}><Activity size={11}/>Live</Btn>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )
            }
          </>
        )
      }
    </div>
  );
}
