import { Sparkles } from "lucide-react";
import { GA, T } from "../styles/theme.js";

export default function LoadingScreen() {
  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:20}}>
      <div style={{width:60,height:60,borderRadius:20,background:GA,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Sparkles size={28} color="white"/>
      </div>
      <p className="outfit" style={{fontSize:24,fontWeight:800,color:T.text}}>Evenova</p>
      <div style={{width:36,height:36,border:`3px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%"}} className="spin"/>
      <p style={{color:T.muted,fontSize:14}}>Loading your platform…</p>
    </div>
  );
}

