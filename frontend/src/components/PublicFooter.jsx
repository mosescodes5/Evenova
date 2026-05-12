import { Mail, MapPin, Phone, Sparkles, Ticket } from "lucide-react";
import { GA, T } from "../styles/theme.js";
import { useMedia } from "../hooks/useMedia.js";

export default function PublicFooter({ onNav }) {
  const { mobile } = useMedia();
  const cols = [
    { title:"Platform", links:[["explore","Browse Events"],["register","Become Organizer"],["login","Organizer Login"]] },
    { title:"Company",  links:[["about","About Us"],["contact","Contact Us"],["landing","Careers"]] },
    { title:"Support",  links:[["contact","Help Centre"],["contact","Ticket Issues"],["contact","Organizer Support"]] },
  ];
  return (
    <footer style={{background:T.surface,borderTop:`1px solid ${T.border}`,paddingTop:56}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"0 24px 40px"}}>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"2fr 1fr 1fr 1fr",gap:40,marginBottom:48}}>
          {/* Brand column */}
          <div>
            <button onClick={()=>onNav("landing")} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",marginBottom:16}}>
              <div style={{width:36,height:36,borderRadius:12,background:GA,display:"flex",alignItems:"center",justifyContent:"center"}}><Sparkles size={18} color="white"/></div>
              <span className="outfit" style={{fontWeight:800,fontSize:22,color:T.text}}>Evenova</span>
            </button>
            <p style={{fontSize:14,color:T.muted,lineHeight:1.8,maxWidth:300,marginBottom:20}}>
              Africa's premier event management platform. Verified organizers, cryptographic QR tickets, and real-time scanning that works even offline.
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <p style={{fontSize:13,color:T.muted}}><Mail size={13} style={{display:"inline",marginRight:6,color:T.accentL}}/>hello.evenova@gmail.com</p>
              <p style={{fontSize:13,color:T.muted}}><Phone size={13} style={{display:"inline",marginRight:6,color:T.accentL}}/>+234 800 EVENOVA</p>
              <p style={{fontSize:13,color:T.muted}}><MapPin size={13} style={{display:"inline",marginRight:6,color:T.accentL}}/>Victoria Island, Lagos, Nigeria</p>
            </div>
          </div>
          {/* Link columns */}
          {cols.map(col=>(
            <div key={col.title}>
              <h4 style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:16,textTransform:"uppercase",letterSpacing:".07em"}}>{col.title}</h4>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {col.links.map(([v,l])=>(
                  <button key={l} onClick={()=>onNav(v)}
                    style={{background:"none",border:"none",color:T.muted,fontSize:14,cursor:"pointer",textAlign:"left",padding:0,transition:"color .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.color=T.text}
                    onMouseLeave={e=>e.currentTarget.style.color=T.muted}>{l}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:24,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <p style={{fontSize:12,color:T.muted}}>© 2025 Evenova Nigeria · Built for African events · All rights reserved</p>
          <div style={{display:"flex",gap:16}}>
            {["Privacy Policy","Terms of Service","Cookie Policy"].map(l=>(
              <button key={l} style={{background:"none",border:"none",fontSize:12,color:T.muted,cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.color=T.text}
                onMouseLeave={e=>e.currentTarget.style.color=T.muted}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────
   12. LANDING PAGE
───────────────────────────────────────────────────────────── */
