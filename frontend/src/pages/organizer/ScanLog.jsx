import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Download, Scan, Search, Ticket, XCircle } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Btn, Card, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { exportAttendees, exportScanLog } from "../../utils/export.js";

export default function ScanLog({ scanLogs, events, orgId }) {
  const { mobile } = useMedia();
  const myEvs  = events.filter(e=>!orgId||e.orgId===orgId);
  const [selEvId,  setSelEvId]  = useState("all");
  const [fStatus,  setFStatus]  = useState("all");
  const [search,   setSearch]   = useState("");

  const visibleLogs = useMemo(()=>
    [...scanLogs]
      .filter(l=>
        (selEvId==="all"||l.evId===selEvId) &&
        (fStatus==="all"||l.status===fStatus) &&
        (!search||l.holderName?.toLowerCase().includes(search.toLowerCase())||l.gateName?.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a,b)=>b.ts-a.ts)
  ,[scanLogs,selEvId,fStatus,search]);

  const admitted  = visibleLogs.filter(l=>l.status==="admitted").length;
  const rejected  = visibleLogs.filter(l=>l.status==="rejected"||l.status==="wrong_gate"||l.status==="wrong_event").length;
  const dupes     = visibleLogs.filter(l=>l.status==="duplicate").length;

  const STATUS_COLOR = {admitted:T.success, rejected:T.danger, duplicate:T.warn, wrong_gate:T.warn, wrong_event:T.warn};

  return (
    <div style={{maxWidth:1200,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:24}}>
        <div>
          <h1 className="outfit" style={{fontSize:24,fontWeight:800,color:T.text,marginBottom:4}}>Scan Session Log</h1>
          <p style={{color:T.muted}}>Timestamped history of every scan attempt</p>
        </div>
        <Btn sz="sm" v="secondary"
          onClick={()=>{
            const ev=myEvs.find(e=>e.id===selEvId);
            const logsToExport=selEvId==="all"?visibleLogs:visibleLogs.filter(l=>l.evId===selEvId);
            exportScanLog(logsToExport, ev?.title||"All Events");
          }}>
          <Download size={13}/>Export Log CSV
        </Btn>
      </div>

      <div className="g3" style={{marginBottom:24}}>
        <StatCard label="Admitted" value={admitted} icon={CheckCircle} color={T.success}/>
        <StatCard label="Rejected / Wrong" value={rejected} icon={XCircle} color={T.danger}/>
        <StatCard label="Duplicate Attempts" value={dupes} icon={AlertTriangle} color={T.warn}/>
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
        <select value={selEvId} onChange={e=>setSelEvId(e.target.value)}
          style={{padding:"9px 12px",borderRadius:10,background:T.surface,border:`1px solid ${T.border}`,color:T.text,fontSize:13}}>
          <option value="all">All Events</option>
          {myEvs.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
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
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or gate…"
            style={{background:"none",border:"none",color:T.text,fontSize:13,flex:1,outline:"none"}}/>
        </div>
        <span style={{fontSize:12,color:T.muted,whiteSpace:"nowrap"}}>{visibleLogs.length} entries</span>
      </div>

      {visibleLogs.length===0
        ? <Card style={{padding:60,textAlign:"center"}}>
            <Scan size={36} style={{color:T.muted,margin:"0 auto 16px"}}/>
            <p style={{color:T.muted,fontSize:15}}>No scan logs yet. Start scanning tickets to see history here.</p>
          </Card>
        : (
          <Card style={{overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",minWidth:600}}>
                <thead>
                  <tr style={{background:T.surface,borderBottom:`1px solid ${T.border}`}}>
                    {["#","Time","Attendee","Gate","Ticket Tier","Staff","Status","Reason"].map(h=>(
                      <th key={h} style={{padding:"12px 16px",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.slice(0,100).map((log,i)=>{
                    const col=STATUS_COLOR[log.status]||T.muted;
                    return (
                      <tr key={log.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?"transparent":T.subtle+"80"}}>
                        <td style={{padding:"10px 16px",fontSize:12,color:T.muted}}>{visibleLogs.length-i}</td>
                        <td style={{padding:"10px 16px",fontSize:12,color:T.muted,whiteSpace:"nowrap"}}>
                          {new Date(log.ts).toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
                        </td>
                        <td style={{padding:"10px 16px",fontSize:13,color:T.text,fontWeight:600}}>{log.holderName||"—"}</td>
                        <td style={{padding:"10px 16px",fontSize:12,color:T.muted}}>{log.gateName||"—"}</td>
                        <td style={{padding:"10px 16px",fontSize:12,color:T.muted}}>{log.ticketTypeName||"—"}</td>
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
            {visibleLogs.length>100 && <p style={{padding:"12px 16px",fontSize:13,color:T.muted,textAlign:"center"}}>Showing 100 of {visibleLogs.length} · Export CSV for full log</p>}
          </Card>
        )
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   26. TEAM MANAGEMENT
───────────────────────────────────────────────────────────── */
