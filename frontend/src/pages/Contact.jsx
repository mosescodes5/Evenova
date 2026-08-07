import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { T } from "../styles/theme.js";
import { Btn, Card, Inp } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";

export default function Contact({ notify }) {
  const { mobile } = useMedia();
  const [form, setForm] = useState({ name:"", email:"", subject:"", msg:"" });
  const set = k => v => setForm(f=>({...f,[k]:v}));
  const submit = () => {
    if (!form.name || !form.email || !form.msg) { notify("Please fill all required fields","error"); return; }
    notify("Message sent! We'll reply within 24 hours.");
    setForm({ name:"", email:"", subject:"", msg:"" });
  };
  const infos = [
    [Mail,  "hello.evenova@gmail.com",  "General enquiries"],
    [Phone, "+234 800 EVENOVA",  "Mon–Fri 9am–6pm WAT"],
    [MapPin,"Victoria Island, Lagos","Our headquarters"],
  ];
  return (
    <div style={{background:T.bg,paddingTop:64}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:mobile?"60px 16px":"80px 24px"}}>
        <div style={{textAlign:"center",marginBottom:52}}>
          <h1 className="outfit" style={{fontSize:mobile?34:48,fontWeight:900,color:T.text,marginBottom:12}}>Get in Touch</h1>
          <p style={{color:T.muted,fontSize:16}}>Our team responds within 24 hours.</p>
        </div>
        <div className="g2" style={{alignItems:"start"}}>
          <div>
            {infos.map(([Icon,val,sub],i)=>(
              <Card key={i} style={{padding:"18px 24px",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:T.accent+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon size={20} style={{color:T.accentL}}/></div>
                  <div><p style={{fontWeight:700,color:T.text,fontSize:14}}>{val}</p><p style={{fontSize:12,color:T.muted,marginTop:2}}>{sub}</p></div>
                </div>
              </Card>
            ))}
          </div>
          <Card style={{padding:32}}>
            <h3 style={{fontSize:18,fontWeight:700,color:T.text,marginBottom:20}}>Send a Message</h3>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div className="g2">
                <Inp label="Your Name" value={form.name} onChange={set("name")} required/>
                <Inp label="Email" type="email" value={form.email} onChange={set("email")} required/>
              </div>
              <Inp label="Subject" value={form.subject} onChange={set("subject")} placeholder="What's this about?"/>
              <Inp label="Message" type="textarea" value={form.msg} onChange={set("msg")} rows={5} required/>
              <Btn full sz="lg" onClick={submit}><Send size={15}/>Send Message</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   15. EXPLORE PAGE
───────────────────────────────────────────────────────────── */
