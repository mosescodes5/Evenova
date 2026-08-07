import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Download, Scan, Search, XCircle } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Btn, Card, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";

export default function AdminScanLogView({ scanLogs, events, organizers }) {
  const { mobile } = useMedia();
  const [selOrgId,  setSelOrgId]  = useState("all");
  const [selEvId,   setSelEvId]   = useState("all");
  const [fStatus,   setFStatus]   = useState("all");
  const [search,    setSearch]    = useState("");

  const filteredEvs = selOrgId==="all" ? events : events.filter(e=>e.orgId===selOrgId);

  const visibleLogs = useMemo(()=>
    [...scanLogs]
      .filter(l=>
        (selOrgId==="all"||filteredEvs.some(e=>e.id===l.evId)) &&
        (selEvId==="all"||l.evId===selEvId) &&
        (fStatus==="all"||l.status===fStatus) &&
        (!search||l.holderName?.toLowerCase().includes(search.toLowerCase())||l.evTitle?.toLowerCase().includes(search.toLowerCase())||l.staffName?.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a,b)=>b.ts-a.ts)
  ,[scanLogs,selOrgId,selEvId,fStatus,search,filteredEvs]);

  const admitted = visibleLogs.filter(l=>l.status==="admitted").length;
  const rejected = visibleLogs.filter(l=>l.status==="rejected"||l.status==="wrong_gate").length;
  const dupes    = visibleLogs.filter(l=>l.status==="duplicate").length;
  const STATUS_COLOR = {admitted:T.success,rejected:T.danger,duplicate:T.warn,wrong_gate:T.warn};

  return (
    <div style={{maxWidth:1280,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:24}}>
        <div>
          <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text,marginBottom:4}}>Platform Scan Log</h1>
          <p style={{color:T.muted}}>All scan activity across every event and organizer</p>
        </div>
        <Btn sz="sm" v="secondary" onClick={()=>exportScanLog(visibleLogs,"Platform_All_Events")}><Download size={13}/>Export CSV</Btn>
      </div>

      <div className="g3" style={{marginBottom:24}}>
        <StatCard label="Admitted" value={admitted} icon={CheckCircle} color={T.success}/>
        <StatCard label="Rejected / Wrong Gate" value={rejected} icon={XCircle} color={T.danger}/>
        <StatCard label="Duplicate Attempts" value={dupes} icon={AlertTriangle} color={T.warn}/>
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
        <select value={selOrgId} onChange={e=>{setSelOrgId(e.target.value);setSelEvId("all");}}
          style={{padding:"9px 12px",borderRadius:10,background:T.surface,border:`1px solid ${T.border}`,color:T.text,fontSize:13}}>
          <option value="all">All Organizers</option>
          {organizers.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={selEvId} onChange={e=>setSelEvId(e.target.value)}
          style={{padding:"9px 12px",borderRadius:10,background:T.surface,border:`1px solid ${T.border}`,color:T.text,fontSize:13}}>
          <option value="all">All Events</option>
          {filteredEvs.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)}
          style={{padding:"9px 12px",borderRadius:10,background:T.surface,border:`1px solid ${T.border}`,color:T.text,fontSize:13}}>
          <option value="all">All Status</option>
          <option value="admitted">Admitted</option>
          <option value="rejected">Rejected</option>
          <option value="duplicate">Duplicate</option>
          <option value="wrong_gate">Wrong Gate</option>
        </select>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:200,padding:"9px 14px",borderRadius:10,background:T.surface,border:`1px solid ${T.border}`}}>
          <Search size={14} style={{color:T.muted}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search attendee, event, staff…"
            style={{background:"none",border:"none",color:T.text,fontSize:13,flex:1,outline:"none"}}/>
        </div>
        <span style={{fontSize:12,color:T.muted,whiteSpace:"nowrap"}}>{visibleLogs.length} entries</span>
      </div>

      {visibleLogs.length===0
        ? <Card style={{padding:60,textAlign:"center"}}>
            <Scan size={36} style={{color:T.muted,margin:"0 auto 16px"}}/>
            <p style={{color:T.muted,fontSize:15}}>No scan logs match your filters.</p>
          </Card>
        : (
          <Card style={{overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",minWidth:700}}>
                <thead>
                  <tr style={{background:T.surface,borderBottom:`1px solid ${T.border}`}}>
                    {["#","Time","Attendee","Event","Gate","Staff","Status","Reason"].map(h=>(
                      <th key={h} style={{padding:"12px 16px",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.slice(0,150).map((log,i)=>{
                    const col=STATUS_COLOR[log.status]||T.muted;
                    return (
                      <tr key={log.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?"transparent":T.subtle+"80"}}>
                        <td style={{padding:"10px 16px",fontSize:12,color:T.muted}}>{visibleLogs.length-i}</td>
                        <td style={{padding:"10px 16px",fontSize:12,color:T.muted,whiteSpace:"nowrap"}}>
                          {new Date(log.ts).toLocaleString("en-NG",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                        </td>
                        <td style={{padding:"10px 16px",fontSize:13,color:T.text,fontWeight:600}}>{log.holderName||"—"}</td>
                        <td style={{padding:"10px 16px",fontSize:12,color:T.muted,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.evTitle||"—"}</td>
                        <td style={{padding:"10px 16px",fontSize:12,color:T.muted}}>{log.gateName||"—"}</td>
                        <td style={{padding:"10px 16px",fontSize:12,color:T.muted}}>{log.staffName||"System"}</td>
                        <td style={{padding:"10px 16px"}}>
                          <span style={{padding:"3px 10px",borderRadius:100,fontSize:11,fontWeight:700,
                            background:col+"22",color:col,border:`1px solid ${col+"33"}`,textTransform:"capitalize"}}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{padding:"10px 16px",fontSize:11,color:T.muted}}>{log.reason||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visibleLogs.length>150 && <p style={{padding:"12px 16px",fontSize:13,color:T.muted,textAlign:"center"}}>Showing 150 of {visibleLogs.length} · Export CSV for full log</p>}
          </Card>
        )
      }
    </div>
  );
}

