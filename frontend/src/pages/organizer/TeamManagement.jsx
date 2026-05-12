import { useState } from "react";
import { Scan, Star, Trash2, UserCheck, UserPlus, Users } from "lucide-react";
import { GA, T } from "../../styles/theme.js";
import { Bdg, Btn, Card, Inp, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";

export default function TeamManagement({ org, events, onAddStaff, onRemoveStaff, scanLogs = [] }) {
  const { mobile } = useMedia();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", role:"Scanner", pw:"", gateIds:[] });
  const [activeTab, setActiveTab] = useState("team"); // "team" | "performance"
  const myEvs = events.filter(e=>e.orgId===org.id);
  const allGates = myEvs.flatMap(ev=>Object.entries(ev.gates).map(([id,g])=>({id,...g,evTitle:ev.title})));
  const set = k => v => setForm(f=>({...f,[k]:v}));
  const toggleGate = gId => setForm(f=>({...f,gateIds:f.gateIds.includes(gId)?f.gateIds.filter(x=>x!==gId):[...f.gateIds,gId]}));
  const submit = () => {
    if(!form.name||!form.email||!form.pw)return;
    onAddStaff({id:genId("USR"),name:form.name,email:form.email,role:form.role,password:form.pw,gateIds:form.gateIds});
    setForm({name:"",email:"",role:"Scanner",pw:"",gateIds:[]});
    setShowAdd(false);
  };

  // Compute per-staff scan stats from scan logs
  const staffStats = org.staff.map(s=>{
    const myLogs = scanLogs.filter(l=>l.staffId===s.id);
    const admitted  = myLogs.filter(l=>l.status==="admitted").length;
    const rejected  = myLogs.filter(l=>l.status==="rejected"||l.status==="wrong_gate").length;
    const dupes     = myLogs.filter(l=>l.status==="duplicate").length;
    const total     = myLogs.length;
    const rate      = total ? Math.round(admitted/total*100) : 0;
    // Last scan timestamp
    const lastScan  = myLogs.length ? Math.max(...myLogs.map(l=>l.ts)) : null;
    return { ...s, admitted, rejected, dupes, total, rate, lastScan };
  }).sort((a,b)=>b.total-a.total);

  const totalScansByStaff = staffStats.reduce((s,x)=>s+x.total,0);
  const topScanner = staffStats.find(s=>s.total===Math.max(...staffStats.map(x=>x.total),0));

  return (
    <div style={{maxWidth:960,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:14}}>
        <div>
          <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text}}>Team Management</h1>
          <p style={{color:T.muted,marginTop:4}}>{org.staff.length}/{org.teamSize} staff accounts active</p>
        </div>
        {org.staff.length<org.teamSize && <Btn onClick={()=>setShowAdd(!showAdd)} icon={<UserPlus size={15}/>}>Add Staff</Btn>}
      </div>

      {/* Tab switcher */}
      <div style={{display:"flex",gap:4,padding:4,background:T.surface,borderRadius:12,marginBottom:24,width:"fit-content"}}>
        {[["team","👤 Team Members"],["performance","📊 Scan Performance"]].map(([v,l])=>(
          <button key={v} onClick={()=>setActiveTab(v)}
            style={{padding:"8px 20px",borderRadius:9,border:"none",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .2s",
              background:activeTab===v?T.card:"transparent",color:activeTab===v?T.text:T.muted}}>
            {l}
          </button>
        ))}
      </div>

      {/* Slot bar */}
      <Card style={{padding:18,marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:T.muted,marginBottom:8}}>
          <span>Staff slots used</span><span style={{color:T.text,fontWeight:700}}>{org.staff.length}/{org.teamSize}</span>
        </div>
        <div style={{height:6,borderRadius:100,background:T.border}}>
          <div style={{height:"100%",borderRadius:100,background:org.staff.length>=org.teamSize?`linear-gradient(90deg,${T.danger},${T.warn})`:GA,width:`${(org.staff.length/org.teamSize)*100}%`,transition:"width .5s"}}/>
        </div>
      </Card>

      {activeTab==="team" && (
        <>
          {showAdd && (
            <Card style={{padding:24,marginBottom:20,border:`2px solid ${T.accent+"40"}`}}>
              <h3 style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:18}}>New Staff Account</h3>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="g2">
                  <Inp label="Full Name" value={form.name} onChange={set("name")} required/>
                  <Inp label="Email" type="email" value={form.email} onChange={set("email")} required/>
                  <Inp label="Role" value={form.role} onChange={set("role")} options={["Scanner","Coordinator","Manager","Photographer"].map(r=>({value:r,label:r}))}/>
                  <Inp label="Password" type="password" value={form.pw} onChange={set("pw")} required/>
                </div>
                {allGates.length>0 && (
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",display:"block",marginBottom:8}}>Assigned Gates</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {allGates.map(g=>(
                        <button key={g.id} onClick={()=>toggleGate(g.id)}
                          style={{padding:"5px 14px",borderRadius:100,fontSize:12,fontWeight:700,
                            border:`1px solid ${form.gateIds.includes(g.id)?g.color:T.border}`,
                            background:form.gateIds.includes(g.id)?g.color+"20":"transparent",
                            color:form.gateIds.includes(g.id)?g.color:T.muted,cursor:"pointer"}}>
                          <div style={{width:7,height:7,borderRadius:"50%",background:g.color,display:"inline-block",marginRight:5}}/>
                          {g.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{padding:12,borderRadius:10,background:T.surface,fontSize:12,color:T.muted}}>
                  Staff can only access: Scanner and Live Stats. They only see their assigned gates.
                </div>
                <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                  <Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn>
                  <Btn onClick={submit}>Create Account</Btn>
                </div>
              </div>
            </Card>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {org.staff.map(s=>{
              const st = staffStats.find(x=>x.id===s.id);
              const assignedGates=allGates.filter(g=>s.gateIds?.includes(g.id));
              return (
                <Card key={s.id} style={{padding:20}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:14,flexWrap:mobile?"wrap":"nowrap"}}>
                    <div style={{width:44,height:44,borderRadius:"50%",background:GA,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"white",flexShrink:0}}>
                      {s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:15,fontWeight:700,color:T.text}}>{s.name}</span>
                        <Bdg color="blue">{s.role}</Bdg>
                        {st?.total>0 && <Bdg color="green">{st.total} scans</Bdg>}
                      </div>
                      <p style={{fontSize:12,color:T.muted,marginBottom:assignedGates.length||st?.total>0?8:0}}>{s.email}</p>
                      {st?.total>0 && (
                        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:assignedGates.length?8:0}}>
                          <span style={{fontSize:11,color:T.success}}>✅ {st.admitted} admitted</span>
                          <span style={{fontSize:11,color:T.danger}}>❌ {st.rejected} rejected</span>
                          {st.dupes>0 && <span style={{fontSize:11,color:T.warn}}>⚠️ {st.dupes} dupes</span>}
                          {st.lastScan && <span style={{fontSize:11,color:T.muted}}>Last: {new Date(st.lastScan).toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"})}</span>}
                        </div>
                      )}
                      {assignedGates.length>0 && (
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {assignedGates.map(g=>(
                            <span key={g.id} style={{fontSize:11,padding:"2px 10px",borderRadius:100,background:g.color+"20",color:g.color,border:`1px solid ${g.color+"30"}`}}>{g.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={()=>onRemoveStaff(s.id)}
                      style={{padding:8,borderRadius:10,background:"transparent",border:`1px solid ${T.border}`,cursor:"pointer",color:T.muted,transition:"all .2s",flexShrink:0}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=T.danger+"50";e.currentTarget.style.color=T.danger;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted;}}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </Card>
              );
            })}
            {org.staff.length===0 && (
              <Card style={{padding:50,textAlign:"center"}}>
                <Users size={36} style={{color:T.muted,margin:"0 auto 14px"}}/>
                <p style={{color:T.muted}}>No staff yet. Add your team above.</p>
              </Card>
            )}
          </div>
        </>
      )}

      {activeTab==="performance" && (
        <>
          {/* Summary KPIs */}
          <div className="g3" style={{marginBottom:24}}>
            <StatCard label="Total Staff Scans" value={totalScansByStaff} icon={Scan} color={T.accent}/>
            <StatCard label="Top Scanner" value={topScanner?.name?.split(" ")[0]||"—"} icon={Star} color={T.gold} sub={topScanner?`${topScanner.total} scans`:""}/>
            <StatCard label="Active Staff" value={staffStats.filter(s=>s.total>0).length} icon={UserCheck} color={T.success} sub={`of ${org.staff.length} total`}/>
          </div>

          {staffStats.length===0
            ? <Card style={{padding:60,textAlign:"center"}}><p style={{color:T.muted}}>No staff scans recorded yet.</p></Card>
            : (
              <Card style={{overflow:"hidden"}}>
                <div style={{padding:"18px 24px",borderBottom:`1px solid ${T.border}`}}>
                  <h3 style={{fontSize:15,fontWeight:700,color:T.text}}>Staff Scan Leaderboard</h3>
                  <p style={{fontSize:12,color:T.muted,marginTop:2}}>Ranked by total scan activity</p>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",minWidth:500}}>
                    <thead>
                      <tr style={{background:T.surface,borderBottom:`1px solid ${T.border}`}}>
                        {["Rank","Staff Member","Role","Admitted","Rejected","Dupes","Total","Rate","Last Active"].map(h=>(
                          <th key={h} style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em",whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staffStats.map((s,i)=>(
                        <tr key={s.id} style={{borderBottom:`1px solid ${T.border}`,background:i===0&&s.total>0?T.gold+"08":"transparent"}}>
                          <td style={{padding:"12px 14px",fontSize:14,fontWeight:800,color:i===0?T.gold:T.muted}}>{i===0&&s.total>0?"🥇":i+1}</td>
                          <td style={{padding:"12px 14px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:30,height:30,borderRadius:"50%",background:GA,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"white",flexShrink:0}}>
                                {s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                              </div>
                              <span style={{fontSize:13,fontWeight:600,color:T.text}}>{s.name}</span>
                            </div>
                          </td>
                          <td style={{padding:"12px 14px"}}><Bdg color="blue">{s.role}</Bdg></td>
                          <td style={{padding:"12px 14px",fontSize:13,fontWeight:700,color:T.success}}>{s.admitted}</td>
                          <td style={{padding:"12px 14px",fontSize:13,color:T.danger}}>{s.rejected}</td>
                          <td style={{padding:"12px 14px",fontSize:13,color:T.warn}}>{s.dupes}</td>
                          <td style={{padding:"12px 14px",fontSize:14,fontWeight:800,color:T.text}}>{s.total}</td>
                          <td style={{padding:"12px 14px"}}>
                            {s.total>0
                              ? <span style={{fontSize:12,fontWeight:700,color:s.rate>=80?T.success:s.rate>=50?T.gold:T.danger}}>{s.rate}%</span>
                              : <span style={{fontSize:12,color:T.muted}}>—</span>
                            }
                          </td>
                          <td style={{padding:"12px 14px",fontSize:11,color:T.muted}}>
                            {s.lastScan ? new Date(s.lastScan).toLocaleString("en-NG",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          }
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   27. SCANNER
───────────────────────────────────────────────────────────── */
