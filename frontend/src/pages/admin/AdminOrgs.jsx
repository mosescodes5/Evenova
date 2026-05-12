import { useState } from "react";
import { Building, CheckCircle, Clock, Mail, Phone, Shield, Users, XCircle } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Bdg, Btn, Card, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";

export default function AdminOrgs({ organizers, onApprove, onReject }) {
  const { mobile } = useMedia();
  const [filter, setFilter] = useState("all");
  const list = filter==="all"?organizers:organizers.filter(o=>o.status===filter);
  return (
    <div style={{maxWidth:1000,margin:"0 auto",padding:mobile?"16px":"32px 24px"}}>
      <h1 className="outfit" style={{fontSize:26,fontWeight:800,color:T.text,marginBottom:28}}>Organizer Management</h1>
      <div className="g3" style={{marginBottom:28}}>
        <StatCard label="Pending" value={organizers.filter(o=>o.status==="pending").length} icon={Clock} color={T.gold}/>
        <StatCard label="Approved" value={organizers.filter(o=>o.status==="approved").length} icon={CheckCircle} color={T.success}/>
        <StatCard label="Total" value={organizers.length} icon={Building} color={T.info}/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[["all","All"],["pending","Pending"],["approved","Approved"],["rejected","Rejected"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)}
            style={{padding:"6px 14px",borderRadius:100,fontSize:12,fontWeight:700,
              border:`1px solid ${filter===v?T.accent:T.border}`,
              background:filter===v?T.accent+"20":"transparent",
              color:filter===v?T.accentL:T.muted,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {list.map(org=>(
          <Card key={org.id} style={{padding:22}}>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <h3 style={{fontSize:16,fontWeight:700,color:T.text}}>{org.name}</h3>
                  <Bdg color={org.status==="pending"?"gold":org.status==="approved"?"green":"red"}>{org.status}</Bdg>
                </div>
                <p style={{fontSize:13,color:T.muted,marginBottom:10}}>{org.contactName}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
                  {[[Mail,org.email],[Phone,org.phone],[Shield,`${org.idType}: ${org.idNumber}`],[Users,`${org.staff.length}/${org.teamSize} staff`]].map(([Icon,v],i)=>(
                    <span key={i} style={{fontSize:12,color:T.muted,display:"flex",alignItems:"center",gap:4}}><Icon size={12}/>{v}</span>
                  ))}
                </div>
              </div>
              {org.status==="pending" && (
                <div style={{display:"flex",gap:8,alignSelf:"flex-start"}}>
                  <Btn sz="sm" v="danger" onClick={()=>onReject(org.id)}><XCircle size={13}/>Reject</Btn>
                  <Btn sz="sm" onClick={()=>onApprove(org.id)}><CheckCircle size={13}/>Approve</Btn>
                </div>
              )}
            </div>
          </Card>
        ))}
        {list.length===0 && <Card style={{padding:40,textAlign:"center"}}><p style={{color:T.muted}}>No organizers in this category</p></Card>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   21-B. EMAIL BLAST  — Excel upload · AI cleanup · SES send
───────────────────────────────────────────────────────────── */
