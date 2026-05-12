import { useState } from "react";
import { ArrowRight, BarChart3, Calendar, ChevronRight, MapPin, Music, QrCode, Scan, Star, Ticket } from "lucide-react";
import { EVENT_BANNERS, GA, T } from "../styles/theme.js";
import { Bdg, Btn, Card } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";
import { ADS } from "../data/seedData.js";

export default function Landing({ events, onNav, onEventPage }) {
  const { mobile, tablet } = useMedia();
  const [cat, setCat] = useState("All");
  const cats = ["All","Music","Technology","Food & Drinks","Arts"];
  const filtered = cat === "All" ? events : events.filter(e => e.category === cat);

  const STATS = [
    { v:"12,480+", l:"Tickets Sold",   c:T.accent },
    { v:"456+",    l:"Events Hosted",  c:T.gold },
    { v:"89+",     l:"Organizers",     c:T.success },
    { v:"65,200+", l:"Attendees",      c:T.info },
  ];

  return (
    <div style={{background:T.bg}}>
      {/* ── HERO ── */}
      <div style={{position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",overflow:"hidden",paddingTop:64}}>
        {/* Background orbs */}
        {[[T.accent,"-5%","10%",600],[T.gold,"75%","60%",500],[T.info,"45%","-5%",400]].map(([col,x,y,sz],i)=>(
          <div key={i} className="orb" style={{position:"absolute",left:x,top:y,width:sz,height:sz,
            borderRadius:"50%",background:col,opacity:.06,filter:"blur(90px)",animationDelay:`${i*3}s`}}/>
        ))}

        <div style={{maxWidth:1200,margin:"0 auto",padding:mobile?"60px 20px":"80px 24px",
          width:"100%",display:"grid",gridTemplateColumns:tablet?"1fr":"1fr 1fr",
          gap:60,alignItems:"center"}}>
          {/* Text */}
          <div className="fade-up">
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 16px",
              borderRadius:100,background:T.accent+"20",border:`1px solid ${T.accent+"40"}`,
              color:T.accentL,fontSize:12,fontWeight:700,marginBottom:24}}>
              <div className="live-dot" style={{width:7,height:7,borderRadius:"50%",background:T.success}}/>
              Live now · Events happening in Lagos
            </div>

            <h1 className="outfit" style={{fontSize:mobile?36:58,fontWeight:900,lineHeight:1.08,
              color:T.text,marginBottom:20}}>
              Africa's Premier<br/>
              <span style={{background:`linear-gradient(135deg,${T.accent},${T.gold})`,
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                Event Platform.
              </span>
            </h1>

            <p style={{fontSize:mobile?15:18,color:T.muted,lineHeight:1.75,marginBottom:32,maxWidth:480}}>
              Verified organizers. Signed QR tickets. Offline-first scanning.
              Everything you need to run world-class events in Africa.
            </p>

            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:48}}>
              <Btn sz="lg" onClick={()=>onNav("explore")}>Explore Events <ArrowRight size={16}/></Btn>
              <Btn sz="lg" v="secondary" onClick={()=>onNav("register")}>Become Organizer</Btn>
            </div>

            {/* Platform stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              {STATS.map((s,i)=>(
                <div key={i} style={{textAlign:"center"}}>
                  <p className="outfit" style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</p>
                  <p style={{fontSize:11,color:T.muted,marginTop:2}}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating event cards */}
          {!tablet && (
            <div className="hero-cards" style={{position:"relative",height:460}}>
              {events.filter(e=>e.featured).slice(0,2).map((ev,i)=>{
                const minP = Math.min(...Object.values(ev.ticketTypes).map(t=>t.price));
                return (
                  <div key={ev.id} className={i===0?"float-a":"float-b"}
                    style={{position:"absolute",[i===0?"left":"right"]:0,top:i===0?0:120,width:260,cursor:"pointer"}}
                    onClick={()=>onEventPage(ev.id)}>
                    <Card style={{overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,.6)"}} hover>
                      <div style={{height:140,background:EVENT_BANNERS[ev.banner]||EVENT_BANNERS.music,
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Bdg color="purple">{ev.category}</Bdg>
                      </div>
                      <div style={{padding:16}}>
                        <p style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:6}}>{ev.title}</p>
                        <p style={{fontSize:12,color:T.muted}}>{ev.date} · {ev.venue}</p>
                        <p style={{fontSize:14,fontWeight:800,color:T.gold,marginTop:8}}>From ₦{minP.toLocaleString()}</p>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── TICKER ── */}
      <div style={{background:T.accent+"18",borderTop:`1px solid ${T.accent+"30"}`,
        borderBottom:`1px solid ${T.accent+"30"}`,padding:"12px 0",overflow:"hidden"}}>
        <div className="ticker-wrap" style={{display:"flex",gap:48,whiteSpace:"nowrap"}}>
          {[...Array(2)].flatMap(()=>[
            "🎵 Afrobeats Fest Lagos — 87% sold","💻 Tech Summit Nigeria — Early Bird live",
            "🍷 Lagos Food Festival — New vendors added","🎭 Felabration 2025 — Premium tickets available",
            "🎟 65,200+ attendees trust Evenova",
          ]).map((a,i)=>(
            <span key={i} style={{fontSize:13,color:T.accentL,flexShrink:0,padding:"0 4px"}}>{a}</span>
          ))}
        </div>
      </div>

      {/* ── UPCOMING EVENTS ── */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:mobile?"60px 16px":"80px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",
          marginBottom:32,flexWrap:"wrap",gap:16}}>
          <div>
            <h2 className="outfit" style={{fontSize:mobile?28:36,fontWeight:800,color:T.text}}>Upcoming Events</h2>
            <p style={{color:T.muted,marginTop:4}}>Discover what's happening around you</p>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {cats.map(c=>(
              <button key={c} onClick={()=>setCat(c)}
                style={{padding:"6px 14px",borderRadius:100,fontSize:12,fontWeight:700,
                  border:`1px solid ${cat===c?T.accent:T.border}`,
                  background:cat===c?T.accent+"20":"transparent",
                  color:cat===c?T.accentL:T.muted,cursor:"pointer",transition:"all .2s"}}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="ga">
          {filtered.map(ev=>{
            const minP = Math.min(...Object.values(ev.ticketTypes).map(t=>t.price));
            const used = ev.tickets.filter(t=>t.status==="used").length;
            const pct  = ev.tickets.length ? Math.round(used/ev.tickets.length*100) : 0;
            const hasEarlyBird = Object.values(ev.ticketTypes).some(t=>t.name.toLowerCase().includes("early"));
            return (
              <Card key={ev.id} hover style={{overflow:"hidden"}} onClick={()=>onEventPage(ev.id)}>
                <div style={{height:160,background:EVENT_BANNERS[ev.banner]||EVENT_BANNERS.music,
                  position:"relative",display:"flex",alignItems:"flex-end",padding:16}}>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,8,15,.7),transparent)"}}/>
                  <div style={{position:"relative",display:"flex",gap:6}}>
                    <Bdg color="purple">{ev.category}</Bdg>
                    {ev.featured && <Bdg color="gold"><Star size={9} style={{marginRight:2}}/>Featured</Bdg>}
                    {hasEarlyBird && <Bdg color="green">🐦 Early Bird</Bdg>}
                  </div>
                </div>
                <div style={{padding:20}}>
                  <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:6,lineHeight:1.3}}>{ev.title}</h3>
                  <p style={{fontSize:12,color:T.muted,marginBottom:4}}><Calendar size={11} style={{display:"inline",marginRight:4}}/>{ev.date} at {ev.time}</p>
                  <p style={{fontSize:12,color:T.muted,marginBottom:14}}><MapPin size={11} style={{display:"inline",marginRight:4}}/>{ev.venue}, {ev.city}</p>
                  <div style={{height:4,borderRadius:100,background:T.border,marginBottom:6}}>
                    <div style={{height:"100%",borderRadius:100,background:GA,width:`${pct}%`,transition:"width 1s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                    <span style={{fontSize:11,color:T.muted}}>{pct}% sold</span>
                    <span style={{fontSize:14,fontWeight:800,color:T.gold}}>From ₦{minP.toLocaleString()}</span>
                  </div>
                  <Btn full sz="sm">Get Tickets <ChevronRight size={13}/></Btn>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── ADS / PARTNERS ── */}
      <div style={{background:T.surface,borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:mobile?"40px 16px":"60px 24px"}}>
          <p style={{fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:".1em",marginBottom:20}}>Partners & Sponsors</p>
          <div className="g3">
            {ADS.map(ad=>(
              <Card key={ad.id} hover style={{overflow:"hidden"}}>
                <div style={{padding:"20px 24px",background:`linear-gradient(135deg,${ad.color}28,${ad.color}10)`,borderBottom:`1px solid ${ad.color}25`}}>
                  <p style={{fontSize:11,color:ad.color,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Sponsored · {ad.brand}</p>
                  <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:6}}>{ad.title}</h3>
                  <p style={{fontSize:13,color:T.muted,lineHeight:1.6}}>{ad.sub}</p>
                </div>
                <div style={{padding:"12px 24px"}}>
                  <button style={{fontSize:12,fontWeight:700,color:ad.color,background:ad.color+"15",
                    border:`1px solid ${ad.color+"30"}`,padding:"5px 14px",borderRadius:100,cursor:"pointer"}}>
                    {ad.cta} →
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:mobile?"60px 16px":"80px 24px",textAlign:"center"}}>
        <h2 className="outfit" style={{fontSize:mobile?28:36,fontWeight:800,color:T.text,marginBottom:12}}>How it works</h2>
        <p style={{color:T.muted,fontSize:16,marginBottom:48}}>Simple for attendees. Powerful for organizers.</p>
        <div className="g4">
          {[
            [Ticket,"Browse & Register","Find events and register in seconds with our simple checkout."],
            [QrCode,"Get Signed QR Ticket","Your unique cryptographically signed ticket is emailed instantly."],
            [Scan,"Scan at the Gate","Works online and offline. Compatible with any PDA scanner."],
            [BarChart3,"Live Analytics","Real-time check-ins, gate performance, revenue dashboards."],
          ].map(([Icon,title,desc],i)=>(
            <div key={i}>
              <div style={{width:56,height:56,borderRadius:18,background:T.accent+"25",
                border:`1px solid ${T.accent+"40"}`,display:"flex",alignItems:"center",
                justifyContent:"center",margin:"0 auto 12px"}}>
                <Icon size={24} style={{color:T.accentL}}/>
              </div>
              <div style={{width:24,height:24,borderRadius:"50%",background:GA,color:"white",
                fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",
                margin:"-8px auto 12px"}}>{i+1}</div>
              <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:8}}>{title}</h3>
              <p style={{fontSize:13,color:T.muted,lineHeight:1.6}}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{background:`linear-gradient(135deg,${T.accent}22,${T.accentL}11)`,borderTop:`1px solid ${T.accent+"30"}`}}>
        <div style={{maxWidth:600,margin:"0 auto",padding:mobile?"60px 20px":"80px 24px",textAlign:"center"}}>
          <h2 className="outfit" style={{fontSize:mobile?28:40,fontWeight:900,color:T.text,marginBottom:16}}>
            Ready to host your next event?
          </h2>
          <p style={{color:T.muted,marginBottom:32,fontSize:16}}>Join 89+ verified organizers. Get approved in 48 hours.</p>
          <Btn sz="xl" onClick={()=>onNav("register")}>Start Your Application <ArrowRight size={18}/></Btn>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   13. ABOUT PAGE
───────────────────────────────────────────────────────────── */
