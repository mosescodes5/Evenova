import { useState, useEffect } from "react";
import { CheckCircle, XCircle, X, Bell } from "lucide-react";

const T = {
  accent:"#7c3aed", accentL:"#a78bfa", gold:"#f59e0b",
  text:"#f1f5f9", muted:"#94a3b8", border:"#334155",
  surface:"#1e293b", card:"#0f172a", danger:"#ef4444",
  success:"#22c55e", info:"#38bdf8", warn:"#f97316",
};
const GA = "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)";
const GG = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";

export function Btn({ children, onClick, v = "primary", sz = "md", full, disabled, icon, style: xs = {} }) {
  const pads = { xs:"5px 10px", sm:"7px 14px", md:"10px 20px", lg:"13px 28px", xl:"16px 36px" };
  const fonts = { xs:11, sm:12, md:13, lg:15, xl:17 };
  const styles = {
    primary:   { background: GA,    color:"white",  boxShadow: disabled ? "none" : `0 0 20px ${T.accent}44` },
    gold:      { background: GG,    color:"#1a0800", boxShadow: disabled ? "none" : `0 0 20px ${T.gold}44` },
    secondary: { background:"transparent", color:T.text, border:`1px solid ${T.border}` },
    ghost:     { background:"transparent", color:T.muted },
    danger:    { background:T.danger, color:"white" },
    success:   { background:T.success, color:"white" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7,
        padding:pads[sz], borderRadius:12, fontSize:fonts[sz], fontWeight:700, border:"none",
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1,
        transition:"all .18s", width:full?"100%":"auto",
        ...styles[v], ...xs }}>
      {icon && <span style={{display:"flex",width:fonts[sz]+2,height:fonts[sz]+2}}>{icon}</span>}
      {children}
    </button>
  );
}

export function Inp({ label, value, onChange, type="text", placeholder="", required, hint, options, rows=3 }) {
  const [focused, setFocus] = useState(false);
  const base = { width:"100%", padding:"10px 14px", borderRadius:10, fontSize:14,
    color:T.text, background:T.surface, border:`1px solid ${focused?T.accent:T.border}`,
    transition:"border .18s", fontFamily:"inherit" };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label && <label style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em"}}>
        {label}{required && <span style={{color:T.danger,marginLeft:3}}>*</span>}
      </label>}
      {options
        ? <select value={value} onChange={e=>onChange(e.target.value)} style={base}
            onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}>
            {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
          </select>
        : type==="textarea"
          ? <textarea value={value} onChange={e=>onChange(e.target.value)}
              placeholder={placeholder} rows={rows} style={{...base,resize:"vertical"}}
              onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}/>
          : <input type={type} value={value} onChange={e=>onChange(e.target.value)}
              placeholder={placeholder} required={required} style={base}
              onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}/>}
      {hint && <p style={{fontSize:11,color:T.danger}}>{hint}</p>}
    </div>
  );
}

export function Card({ children, style={}, onClick, hover }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>hover&&setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:T.card, border:`1px solid ${hov?T.accent+"55":T.border}`,
        borderRadius:16, transition:"border-color .2s,transform .2s",
        transform:(hover&&hov)?"translateY(-2px)":"none",
        cursor:onClick?"pointer":"default", ...style }}>
      {children}
    </div>
  );
}

export function Bdg({ children, color="purple", sz="sm" }) {
  const C = {
    purple:{bg:T.accent+"25",fg:T.accentL,bd:T.accent+"40"},
    gold:  {bg:T.gold+"22",  fg:T.gold,   bd:T.gold+"35"},
    green: {bg:T.success+"22",fg:T.success,bd:T.success+"35"},
    red:   {bg:T.danger+"20", fg:T.danger, bd:T.danger+"30"},
    blue:  {bg:T.info+"22",  fg:T.info,   bd:T.info+"35"},
    orange:{bg:T.warn+"20",  fg:T.warn,   bd:T.warn+"30"},
    gray:  {bg:"#ffffff12",  fg:T.muted,  bd:"#ffffff18"},
  };
  const col = C[color]||C.gray;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,
      padding:sz==="sm"?"2px 10px":"4px 14px",
      borderRadius:100, fontSize:sz==="sm"?11:12, fontWeight:700,
      background:col.bg, color:col.fg, border:`1px solid ${col.bd}`,
      whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <Card style={{padding:"20px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <p style={{fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>{label}</p>
          <p className="outfit" style={{fontSize:26,fontWeight:800,color:T.text,lineHeight:1}}>{value}</p>
          {sub && <p style={{fontSize:11,color:T.muted,marginTop:4}}>{sub}</p>}
        </div>
        <div style={{padding:10,borderRadius:12,background:color+"22"}}><Icon size={20} style={{color}}/></div>
      </div>
    </Card>
  );
}

export function Toast({ items, onClose }) {
  return (
    <div style={{position:"fixed",top:16,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:8,maxWidth:360,width:"calc(100% - 32px)"}}>
      {items.map(t=>(
        <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",
          borderRadius:12,backdropFilter:"blur(16px)",animation:"fadeUp .3s ease",
          border:`1px solid ${t.type==="success"?T.success+"40":t.type==="error"?T.danger+"40":T.info+"40"}`,
          background:t.type==="success"?T.success+"15":t.type==="error"?T.danger+"15":T.info+"15"}}>
          {t.type==="success"?<CheckCircle size={15} style={{color:T.success,flexShrink:0}}/>
           :t.type==="error"?<XCircle size={15} style={{color:T.danger,flexShrink:0}}/>
           :<Bell size={15} style={{color:T.info,flexShrink:0}}/>}
          <span style={{fontSize:13,color:T.text,flex:1}}>{t.msg}</span>
          <button onClick={()=>onClose(t.id)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",padding:2}}><X size={12}/></button>
        </div>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width=520 }) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",
      justifyContent:"center",padding:16,background:"rgba(0,0,0,.85)",backdropFilter:"blur(10px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",maxWidth:width,background:T.card,
        border:`1px solid ${T.border}`,borderRadius:20,overflow:"hidden",
        maxHeight:"92vh",overflowY:"auto",animation:"fadeUp .25s ease"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"20px 24px",borderBottom:`1px solid ${T.border}`}}>
          <h2 className="outfit" style={{fontSize:18,fontWeight:700,color:T.text}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",padding:4,borderRadius:8}}><X size={18}/></button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}

export function QRDisplay({ value, size=140 }) {
  const N=21, cell=size/N;
  const inFP=(r,c)=>{ for(const[fr,fc]of[[0,0],[0,N-7],[N-7,0]]){if(r>=fr&&r<fr+7&&c>=fc&&c<fc+7){const lr=r-fr,lc=c-fc;return lr===0||lr===6||lc===0||lc===6||(lr>=2&&lr<=4&&lc>=2&&lc<=4);}} return null; };
  const cells=[];
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    const fp=inFP(r,c);
    const filled=fp!==null?fp:(()=>{let h=5381,k=value+r+c;for(let i=0;i<k.length;i++)h=(Math.imul(h,33)^k.charCodeAt(i))>>>0;return h%2===0;})();
    if(filled)cells.push([c*cell,r*cell]);
  }
  return(
    <div style={{background:"white",padding:8,borderRadius:12,display:"inline-block"}}>
      <svg width={size} height={size}>{cells.map(([x,y],i)=><rect key={i} x={x} y={y} width={cell+.3} height={cell+.3} fill="#1a1a1a"/>)}</svg>
    </div>
  );
}