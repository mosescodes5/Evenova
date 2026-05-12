import { ArrowRight, BarChart3, QrCode, Shield, WifiOff } from "lucide-react";
import { T } from "../styles/theme.js";
import { Btn, Card } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";

export default function About({ onNav }) {
  const { mobile } = useMedia();
  const vals = [
    [Shield,"Verified Organizers","Every organizer provides government ID and completes a video verification call before being approved."],
    [QrCode,"Tamper-Proof Tickets","Cryptographically signed QR codes prevent fakes, screenshots, and duplication at scale."],
    [WifiOff,"Offline-First","Scanners preload encrypted ticket caches. Your event keeps running when the internet doesn't."],
    [BarChart3,"Real-Time Insights","Live dashboards, gate performance metrics, revenue breakdowns, and full scan session logs."],
  ];
  return (
    <div style={{background:T.bg,paddingTop:64}}>
      <div style={{background:`linear-gradient(135deg,${T.accent}20,transparent)`,borderBottom:`1px solid ${T.border}`,padding:mobile?"60px 20px":"80px 24px",textAlign:"center"}}>
        <h1 className="outfit" style={{fontSize:mobile?36:52,fontWeight:900,color:T.text,marginBottom:16}}>Built for African Events</h1>
        <p style={{fontSize:18,color:T.muted,maxWidth:600,margin:"0 auto 32px",lineHeight:1.7}}>
          Evenova is Nigeria's first enterprise-grade event management platform — designed from the ground up for our infrastructure, our internet, and our events.
        </p>
        <Btn sz="lg" onClick={()=>onNav("register")}>Join as Organizer <ArrowRight size={16}/></Btn>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:mobile?"60px 16px":"80px 24px"}}>
        <div className="g2">
          {vals.map(([Icon,t,d],i)=>(
            <Card key={i} style={{padding:28}}>
              <div style={{width:48,height:48,borderRadius:14,background:T.accent+"22",border:`1px solid ${T.accent+"40"}`,
                display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
                <Icon size={22} style={{color:T.accentL}}/>
              </div>
              <h3 style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:8}}>{t}</h3>
              <p style={{fontSize:14,color:T.muted,lineHeight:1.7}}>{d}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   14. CONTACT PAGE
───────────────────────────────────────────────────────────── */
