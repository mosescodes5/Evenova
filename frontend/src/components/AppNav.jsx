import { useState } from "react";
import { Activity, BarChart3, Briefcase, Building, Calendar, DollarSign, LayoutDashboard, LogOut, Menu, Scan, Sparkles, List, Users, Zap } from "lucide-react";
import { GA, T } from "../styles/theme.js";
import { useMedia } from "../hooks/useMedia.js";

export default function AppNav({ user, onNav, onLogout }) {
  const [mOpen, setMOpen] = useState(false);
  const { mobile } = useMedia();
  const orgLinks    = [["dashboard","Dashboard",LayoutDashboard],["events","Events",Calendar],["revenue","Revenue",BarChart3],["team","Team",Users],["scanner","Scanner",Scan],["live","Live",Activity],["scan-log","Scan Log",List],["email-blast","Email Blast",Zap]];
  const staffLinks  = [["scanner","Scanner",Scan],["live","Live",Activity]];
  const adminLinks  = [["admin","Dashboard",LayoutDashboard],["admin-orgs","Organizers",Building],["admin-events","Events",Calendar],["admin-revenue","Revenue",DollarSign],["admin-scan-log","Scan Log",List],["email-blast","Email Blast",Zap],["sponsor-blast","Sponsors",Briefcase]];
  const links = user?.role==="admin"?adminLinks : user?.role==="organizer"?orgLinks:staffLinks;

  return (
    <nav style={{background:T.surface+"ee",borderBottom:`1px solid ${T.border}`,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(16px)"}}>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",height:58,gap:8}}>
        <button onClick={()=>onNav("dashboard")} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",marginRight:8,flexShrink:0}}>
          <div style={{width:30,height:30,borderRadius:10,background:GA,display:"flex",alignItems:"center",justifyContent:"center"}}><Sparkles size={14} color="white"/></div>
          <span className="outfit hide-mobile" style={{fontWeight:800,fontSize:18,color:T.text}}>Evenova</span>
        </button>

        {!mobile && (
          <div style={{display:"flex",gap:2,flex:1,overflowX:"auto"}}>
            {links.map(([v,l,Icon])=>(
              <button key={v} onClick={()=>onNav(v)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:8,
                  background:"none",border:"none",color:T.muted,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}
                onMouseEnter={e=>{e.currentTarget.style.color=T.text;e.currentTarget.style.background="#ffffff08";}}
                onMouseLeave={e=>{e.currentTarget.style.color=T.muted;e.currentTarget.style.background="none";}}>
                <Icon size={14}/>{l}
              </button>
            ))}
          </div>
        )}
        {mobile && <div style={{flex:1}}/>}

        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div className="hide-mobile" style={{textAlign:"right"}}>
            <p style={{fontSize:10,color:T.muted,textTransform:"capitalize"}}>{user?.role}</p>
            <p style={{fontSize:12,fontWeight:700,color:T.text}}>{user?.name||user?.contactName}</p>
          </div>
          {mobile
            ? <button onClick={()=>setMOpen(!mOpen)} style={{background:"none",border:"none",color:T.text,cursor:"pointer"}}><Menu size={20}/></button>
            : <button onClick={onLogout} style={{padding:8,borderRadius:10,background:"#ffffff08",border:"none",color:T.muted,cursor:"pointer"}}><LogOut size={15}/></button>}
        </div>
      </div>

      {mobile && mOpen && (
        <div className="slide-down" style={{background:T.card,borderTop:`1px solid ${T.border}`,padding:12}}>
          {links.map(([v,l,Icon])=>(
            <button key={v} onClick={()=>{onNav(v);setMOpen(false);}}
              style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px 14px",
                background:"none",border:"none",borderBottom:`1px solid ${T.border}`,
                color:T.text,fontSize:14,fontWeight:600,cursor:"pointer"}}>
              <Icon size={16} style={{color:T.muted}}/>{l}
            </button>
          ))}
          <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px 14px",background:"none",border:"none",color:T.danger,fontSize:14,fontWeight:600,cursor:"pointer",marginTop:4}}>
            <LogOut size={16}/>Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────
   20. ADMIN SCREENS
───────────────────────────────────────────────────────────── */