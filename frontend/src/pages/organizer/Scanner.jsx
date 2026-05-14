import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle, Download, RefreshCw, Scan, Wifi, WifiOff, Zap } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Bdg, Btn, Card, Inp } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { verifyQR } from "../../utils/crypto.js";

/* ── jsQR lazy loader (fallback for non-Chrome browsers) ─── */
let _jsQR = null;
async function loadJsQR() {
  if (_jsQR) return _jsQR;
  return new Promise((res) => {
    if (window.jsQR) { _jsQR = window.jsQR; return res(_jsQR); }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.onload = () => { _jsQR = window.jsQR; res(_jsQR); };
    document.head.appendChild(s);
  });
}
const hasBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

export default function Scanner({ events, scanned, offlineMode, onToggleOffline, onScan, onCacheDownload, orgId, user }) {
  const { mobile } = useMedia();
  const [tab, setTab]         = useState("pda");
  const [input, setInput]     = useState("");
  const [result, setResult]   = useState(null);
  const [selEvId, setSelEvId] = useState("");
  const [selGateId, setSelGateId] = useState("");
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [syncCount, setSyncCount]     = useState(0);
  const [camState, setCamState]       = useState("idle"); // idle | starting | active | error
  const [camError, setCamError]       = useState("");
  const [lastCode, setLastCode]       = useState({ v: "", ts: 0 });

  const inputRef   = useRef();
  const videoRef   = useRef();
  const canvasRef  = useRef();
  const rafRef     = useRef();
  const detRef     = useRef(null);
  const streamRef  = useRef(null);
  const rTimer     = useRef();
  const lastRef    = useRef({ v: "", ts: 0 });

  const myEvs = events.filter(e => !orgId || e.orgId === orgId);
  useEffect(() => {
    if (myEvs.length) { setSelEvId(myEvs[0].id); setSelGateId(Object.keys(myEvs[0].gates)[0] || "all"); }
  }, []);
  useEffect(() => { if (tab === "pda" && inputRef.current) inputRef.current.focus(); }, [tab]);

  const ev   = myEvs.find(e => e.id === selEvId);
  const gate = ev?.gates[selGateId];

  const showRes = useCallback(r => {
    setResult(r);
    clearTimeout(rTimer.current);
    rTimer.current = setTimeout(() => setResult(null), 3500);
  }, []);

  const handleScan = useCallback((code) => {
    const clean = (code || "").trim();
    if (!clean || !ev) return;
    setInput(""); if (inputRef.current) inputRef.current.focus();
    const v = verifyQR(clean);
    if (!v.ok) { showRes({ ok:false, icon:"❌", title:"INVALID SIGNATURE", sub:v.reason, color:T.danger }); onScan(null,"rejected",v.reason,selGateId,gate,ev,user); return; }
    if (v.eId !== ev.id) { showRes({ ok:false, icon:"⚠️", title:"WRONG EVENT", sub:"Ticket for a different event.", color:T.warn }); onScan(null,"wrong_event","Different event",selGateId,gate,ev,user); return; }
    const ticket = ev.tickets.find(t => t.id === v.tId);
    if (!ticket) { showRes({ ok:false, icon:"⚠️", title:"NOT FOUND", sub:"Ticket not in database.", color:T.danger }); onScan(null,"rejected","Not found",selGateId,gate,ev,user); return; }
    const key = `${ev.id}:${ticket.id}`;
    if (scanned[key]) { showRes({ ok:false, icon:"🚫", title:"ALREADY USED", sub:`Scanned at ${ev.gates[ticket.gId]?.name}`, color:T.warn }); onScan(ticket,"duplicate","Already scanned",selGateId,gate,ev,user); return; }
    if (ticket.gId !== selGateId && selGateId !== "all") { showRes({ ok:false, icon:"🚧", title:"WRONG GATE", sub:`Ticket is for: ${ev.gates[ticket.gId]?.name}`, color:T.warn }); onScan(ticket,"wrong_gate",`Belongs to ${ev.gates[ticket.gId]?.name}`,selGateId,gate,ev,user); return; }
    onScan(ticket,"admitted","",selGateId,gate,ev,user);
    showRes({ ok:true, icon:"✅", title:"ADMITTED", sub:`${ticket.holderName||"Guest"} · ${ev.ticketTypes[ticket.tpId]?.name} · ${gate?.name||"All Gates"}`, color:T.success });
  }, [ev, selGateId, scanned, gate, user, onScan, showRes]);

  /* ── Camera ──────────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamState("idle");
  }, []);

  const startCamera = useCallback(async () => {
    setCamState("starting"); setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (hasBarcodeDetector) detRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
      else await loadJsQR();
      setCamState("active");
    } catch (e) { setCamError(e.message || "Permission denied"); setCamState("error"); }
  }, []);

  /* Scan loop */
  useEffect(() => {
    if (camState !== "active") return;
    const ctx = canvasRef.current.getContext("2d");
    const tick = async () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
      canvasRef.current.width  = v.videoWidth;
      canvasRef.current.height = v.videoHeight;
      ctx.drawImage(v, 0, 0);
      let code = null;
      try {
        if (hasBarcodeDetector && detRef.current) {
          const r = await detRef.current.detect(canvasRef.current);
          if (r.length) code = r[0].rawValue;
        } else if (_jsQR) {
          const id = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          const r  = _jsQR(id.data, id.width, id.height, { inversionAttempts: "dontInvert" });
          if (r) code = r.data;
        }
      } catch (_) {}
      if (code) {
        const now = Date.now();
        if (code !== lastRef.current.v || now - lastRef.current.ts > 2500) {
          lastRef.current = { v: code, ts: now };
          handleScan(code);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [camState, handleScan]);

  useEffect(() => { if (tab !== "camera") stopCamera(); }, [tab, stopCamera]);
  useEffect(() => () => stopCamera(), [stopCamera]);

  const offlineCount = ev ? ev.tickets.filter(t => t.gId === selGateId || selGateId === "all").length : 0;

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: mobile ? "16px" : "28px 24px" }}>
      <h1 className="outfit" style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 4 }}>QR Scanner</h1>
      <p style={{ color: T.muted, fontSize: 14, marginBottom: 20 }}>Cryptographic ticket verification — online & offline</p>

      {/* Mode tabs */}
      <div style={{ display: "flex", background: T.surface, borderRadius: 14, padding: 4, marginBottom: 18 }}>
        {[["pda", <Scan size={14}/>, "PDA / Manual"], ["camera", <Camera size={14}/>, "Phone Camera"]].map(([k, ic, lb]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "9px 12px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13,
              background: tab === k ? T.accent : "transparent",
              color: tab === k ? "white" : T.muted, cursor: "pointer", transition: "all .2s" }}>
            {ic}{lb}
          </button>
        ))}
      </div>

      {/* Online/Offline */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderRadius: 14,
        border: `1px solid ${offlineMode ? T.danger+"40" : T.success+"40"}`,
        background: offlineMode ? T.danger+"10" : T.success+"10", marginBottom: 16 }}>
        {offlineMode ? <WifiOff size={16} color={T.danger}/> : <Wifi size={16} color={T.success}/>}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: offlineMode ? T.danger : T.success }}>{offlineMode ? "OFFLINE MODE" : "ONLINE MODE"}</p>
          <p style={{ fontSize: 11, color: T.muted }}>{offlineMode ? "Validating from local cache" : "Real-time server verification"}</p>
        </div>
        <button onClick={onToggleOffline} style={{ padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, cursor: "pointer" }}>Switch</button>
      </div>

      {/* Event/Gate pickers */}
      <div className="g2" style={{ marginBottom: 12 }}>
        <Inp label="Event" value={selEvId} onChange={v => { setSelEvId(v); const e = myEvs.find(x => x.id === v); if (e) setSelGateId(Object.keys(e.gates)[0] || "all"); }} options={myEvs.map(e => ({ value: e.id, label: e.title.slice(0, 28) }))}/>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Gate</label>
          <select value={selGateId} onChange={e => setSelGateId(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, color: T.text, background: T.surface, border: `1px solid ${T.border}` }}>
            <option value="all">All Gates</option>
            {ev && Object.entries(ev.gates).map(([id, g]) => <option key={id} value={id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {gate && (
        <div style={{ padding: "9px 14px", borderRadius: 12, background: gate.color+"15", border: `1px solid ${gate.color+"30"}`, display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: gate.color }}/>
          <span style={{ fontSize: 13, fontWeight: 700, color: gate.color }}>Scanning at: {gate.name}</span>
        </div>
      )}

      {/* Offline cache */}
      {offlineMode && (
        <Card style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Local Ticket Cache</p>
              <p style={{ fontSize: 11, color: T.muted }}>{cacheLoaded ? `${offlineCount} tickets loaded` : "Download before going offline"}</p>
            </div>
            <Btn sz="sm" v={cacheLoaded ? "secondary" : "primary"} onClick={() => { onCacheDownload(selEvId); setCacheLoaded(true); }}><Download size={13}/>{cacheLoaded ? "Re-sync" : "Download"}</Btn>
          </div>
          {cacheLoaded && (
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
              <span style={{ fontSize: 11, color: T.muted }}>⚡ {offlineCount} cached</span>
              <button onClick={() => setSyncCount(c => c+1)} style={{ fontSize: 11, color: T.accentL, background: "none", border: "none", cursor: "pointer" }}><RefreshCw size={11} style={{ display: "inline", marginRight: 4 }}/>Sync ({syncCount})</button>
            </div>
          )}
        </Card>
      )}

      {/* Result flash */}
      {result && (
        <div style={{ padding: 24, borderRadius: 18, border: `2px solid ${result.color+"55"}`, background: result.color+"12", textAlign: "center", marginBottom: 16, animation: "fadeUp .2s ease" }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>{result.icon}</div>
          <h2 className="outfit" style={{ fontSize: 22, fontWeight: 900, color: result.color }}>{result.title}</h2>
          <p style={{ fontSize: 14, color: T.muted, marginTop: 6 }}>{result.sub}</p>
        </div>
      )}

      {/* ── PDA TAB ── */}
      {tab === "pda" && (
        <Card style={{ padding: 22, marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 10 }}>Scan QR Code</label>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => (e.key === "Enter" || e.key === "Tab") && handleScan(input)}
            placeholder="PDA / scanner pastes here automatically…"
            style={{ width: "100%", padding: "13px 16px", borderRadius: 12, background: T.surface, border: `1px solid ${T.accent+"50"}`, color: T.gold, fontSize: 12, fontFamily: "monospace" }}/>
          <p style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>Zebra / Honeywell auto-submits. Or paste + Enter.</p>
          <Btn full style={{ marginTop: 14 }} onClick={() => handleScan(input)}>Verify Ticket</Btn>
          {ev && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Test with a real unused ticket:</p>
              {ev.tickets.filter(t => t.status === "unused").slice(0, 2).map(t => (
                <button key={t.id} onClick={() => setInput(t.code)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: T.accentL+"80", fontSize: 11, fontFamily: "monospace", cursor: "pointer", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.code.slice(0, 55)}…</button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── CAMERA TAB ── */}
      {tab === "camera" && (
        <Card style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          {/* Viewport */}
          <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#000", borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: camState === "active" ? "block" : "none" }}/>
            <canvas ref={canvasRef} style={{ display: "none" }}/>

            {camState === "active" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }}/>
                {/* Scan window cutout effect */}
                <div style={{ position: "relative", width: 200, height: 200, zIndex: 1,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)", borderRadius: 16 }}>
                  {/* Corner ticks */}
                  {[{t:0,l:0,bt:"border-top",bl:"border-left"},{t:0,r:0,bt:"border-top",bl:"border-right"},{b:0,l:0,bt:"border-bottom",bl:"border-left"},{b:0,r:0,bt:"border-bottom",bl:"border-right"}].map((pos,i)=>{
                    const st = { position:"absolute", width:24, height:24, zIndex:2,
                      ...(pos.t!==undefined?{top:pos.t}:{}), ...(pos.b!==undefined?{bottom:pos.b}:{}),
                      ...(pos.l!==undefined?{left:pos.l}:{}), ...(pos.r!==undefined?{right:pos.r}:{}),
                      borderTopWidth: i<2 ? 3 : 0, borderBottomWidth: i>=2 ? 3 : 0,
                      borderLeftWidth: i%2===0 ? 3 : 0, borderRightWidth: i%2===1 ? 3 : 0,
                      borderStyle:"solid", borderColor: T.accentL, borderRadius: i===0?"12px 0 0 0":i===1?"0 12px 0 0":i===2?"0 0 0 12px":"0 0 12px 0" };
                    return <div key={i} style={st}/>;
                  })}
                  {/* Animated scan line */}
                  <div style={{ position:"absolute", left:4, right:4, height:2, borderRadius:2,
                    background:`linear-gradient(90deg,transparent,${T.accentL},transparent)`,
                    boxShadow:`0 0 8px ${T.accentL}`, animation:"scanLine 1.8s ease-in-out infinite", zIndex:3 }}/>
                </div>
                <p style={{ position:"absolute", bottom:16, left:0, right:0, textAlign:"center", color:"rgba(255,255,255,0.7)", fontSize:12, fontWeight:600 }}>
                  Hold steady — scanning automatically
                </p>
              </div>
            )}

            {camState === "idle" && (
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, background:"#08080f" }}>
                <div style={{ width:72, height:72, borderRadius:24, background:T.accent+"20", border:`2px dashed ${T.accent+"60"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Camera size={32} color={T.accentL}/>
                </div>
                <p style={{ color:T.muted, fontSize:13, textAlign:"center", maxWidth:240, lineHeight:1.6, padding:"0 24px" }}>
                  Use your phone camera for instant, hands-free QR scanning — no PDA needed
                </p>
                <Btn onClick={startCamera}><Zap size={14}/>Start Camera</Btn>
              </div>
            )}

            {camState === "starting" && (
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, background:"#08080f" }}>
                <div className="spin" style={{ width:36, height:36, borderRadius:"50%", border:`3px solid ${T.accent}33`, borderTopColor:T.accent }}/>
                <p style={{ color:T.muted, fontSize:13 }}>Starting camera…</p>
              </div>
            )}

            {camState === "error" && (
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, background:"#08080f", padding:24 }}>
                <CameraOff size={36} color={T.danger}/>
                <p style={{ color:T.danger, fontSize:13, fontWeight:700, textAlign:"center" }}>Camera unavailable</p>
                <p style={{ color:T.muted, fontSize:12, textAlign:"center" }}>{camError}</p>
                <Btn v="secondary" sz="sm" onClick={startCamera}>Try Again</Btn>
              </div>
            )}
          </div>

          <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderTop:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              {camState === "active" && <><div className="live-dot" style={{ width:7, height:7, borderRadius:"50%", background:T.success }}/><span style={{ fontSize:11, fontWeight:700, color:T.success }}>{hasBarcodeDetector ? "Native · fastest mode" : "jsQR · fallback mode"}</span></>}
              {camState !== "active" && <span style={{ fontSize:11, color:T.muted }}>Camera off</span>}
            </div>
            {camState === "active" && <Btn sz="sm" v="danger" onClick={stopCamera}><CameraOff size={12}/>Stop</Btn>}
          </div>
        </Card>
      )}

      {/* Recent check-ins */}
      {ev && ev.checkinCount > 0 && (
        <Card style={{ padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 12 }}>Recent Check-ins ({ev.checkinCount})</p>
          <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {ev.tickets.filter(t => t.status === "used").slice(-6).reverse().map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle size={13} color={T.success} style={{ flexShrink: 0 }}/>
                <span style={{ fontSize: 13, color: T.text, flex: 1 }}>{t.holderName || "Guest"}</span>
                <Bdg color="gray">{ev.ticketTypes[t.tpId]?.name}</Bdg>
                <span style={{ fontSize: 11, color: T.muted }}>{ev.gates[t.gId]?.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <style>{`@keyframes scanLine { 0%,100%{top:10%} 50%{top:82%} }`}</style>
    </div>
  );
}