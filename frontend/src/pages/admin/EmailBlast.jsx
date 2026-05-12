import { useEffect, useRef, useState } from "react";
import { AlertCircle, Calendar, CheckCircle, Clock, Copy, DollarSign, Plus, Send, Settings, Sparkles, Trash2, Upload, X, Zap } from "lucide-react";
import { GA, T } from "../../styles/theme.js";
import { Bdg, Btn, Card, Inp, Modal } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { KEYS, storGet, storSet } from "../../utils/storage.js";
import { sendBlast, getEmailStatus, configureEmailProvider } from "../../utils/email.js";
import { genId } from "../../utils/crypto.js";

export default function EmailBlast({ org, events, user, notify }) {
  const { mobile } = useMedia();
  const [activeTab, setActiveTab] = useState("compose");

  /* ── Recipients ── */
  const [emails, setEmails] = useState([]);
  const [manualInput, setManualInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aiCleaning, setAiCleaning] = useState(false);
  const [uploadedRows, setUploadedRows] = useState([]);
  const fileRef = useRef();

  /* ── Compose ── */
  const [subject, setSubject] = useState("");
  const [bodyMode, setBodyMode] = useState("rich");
  const [richBody, setRichBody] = useState(`<p>Dear {name},</p>\n<p>We have an exciting update for you!</p>\n<p>Best regards,<br/><strong>${org?.name || "The Team"}</strong></p>`);
  const [htmlBody, setHtmlBody] = useState("");
  const [senderName, setSenderName] = useState(org?.name || "");
  const [senderEmail, setSenderEmail] = useState(org?.email || "");

  /* ── Send state ── */
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendError, setSendError] = useState("");

  /* ── History ── */
  const [blastHistory, setBlastHistory] = useState([]);

  /* ── Backend status ── */
  const [backendStatus, setBackendStatus] = useState(null); // null=loading, { provider, hasKey, mocked }
  const [backendOnline, setBackendOnline] = useState(null); // null | true | false

  /* ── Settings ── */
  const [emailProvider, setEmailProvider] = useState("mock");
  const [resendKey, setResendKey] = useState("");
  const [brevoKey, setBrevoKey] = useState("");
  const [sesEndpoint, setSesEndpoint] = useState("");
  const [sesKey, setSesKey] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [payProvider, setPayProvider] = useState("none");
  const [paystackKey, setPaystackKey] = useState("");
  const [flwKey, setFlwKey] = useState("");

  /* ── Load history + backend status on mount ── */
  useEffect(() => {
    setBlastHistory(storGet(KEYS.BLASTS, []));
    getEmailStatus().then(s => {
      if (s === null) {
        setBackendOnline(false);
        setBackendStatus(null);
      } else {
        setBackendOnline(true);
        setBackendStatus(s);
        setEmailProvider(s.provider || "mock");
      }
    });
  }, []);

  const refreshStatus = async () => {
    const s = await getEmailStatus();
    if (s) { setBackendOnline(true); setBackendStatus(s); setEmailProvider(s.provider || "mock"); }
    else { setBackendOnline(false); setBackendStatus(null); }
  };

  const saveHistory = (h) => { setBlastHistory(h); storSet(KEYS.BLASTS, h); };

  /* ── SheetJS ── */
  const handleExcelUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setUploadedRows(rows);
      const detected = [];
      for (const row of rows) {
        for (const [, val] of Object.entries(row)) {
          const str = String(val || "").trim();
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
            const nameGuess = row["Name"] || row["name"] || row["Full Name"] || row["full_name"] || row["First Name"] || row["first_name"] || "";
            detected.push({ email: str.toLowerCase(), name: String(nameGuess).trim() || str.split("@")[0] });
            break;
          }
        }
      }
      if (detected.length > 0) {
        setEmails(e => mergeEmails(e, detected));
        notify(`✅ Parsed ${detected.length} email${detected.length !== 1 ? "s" : ""} from file`);
      } else {
        notify("⚠️ No emails auto-detected — click AI Clean to extract from messy data", "info");
      }
    } catch (e) {
      notify("Failed to parse file: " + e.message, "error");
    } finally {
      setUploading(false);
    }
  };

  /* ── AI Clean ── */
  const handleAiClean = async () => {
    if (uploadedRows.length === 0) { notify("Upload an Excel file first", "error"); return; }
    setAiCleaning(true);
    try {
      const prompt = `Extract all email addresses and associated names from these raw Excel rows. Return ONLY a JSON array like:
[{"email":"addr@example.com","name":"Full Name"}, ...]
Fix typos (e.g. "gmai.com" → "gmail.com"), normalize case, deduplicate. Ignore rows with no valid email.
Raw data (first 60 rows):
${JSON.stringify(uploadedRows.slice(0, 60), null, 2)}
Return ONLY the JSON array, no explanation.`;
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      const text = (data.content || []).map(b => b.text || "").join("");
      const cleaned = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (!Array.isArray(cleaned)) throw new Error("Unexpected AI response format");
      setEmails(e => mergeEmails(e, cleaned));
      notify(`🤖 AI cleaned & extracted ${cleaned.length} emails`);
    } catch (e) {
      notify("AI clean failed: " + e.message, "error");
    } finally {
      setAiCleaning(false);
    }
  };

  /* ── Manual entry ── */
  const handleManualAdd = () => {
    const parts = manualInput.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const valid = [];
    for (const p of parts) {
      const match = p.match(/^([^<]+?)\s*<([^\s@]+@[^\s@]+\.[^\s@]+)>$/) || null;
      if (match) valid.push({ name: match[1].trim(), email: match[2].toLowerCase() });
      else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) valid.push({ email: p.toLowerCase(), name: p.split("@")[0] });
    }
    if (valid.length === 0) { notify("No valid emails found", "error"); return; }
    setEmails(e => mergeEmails(e, valid));
    setManualInput("");
    notify(`Added ${valid.length} email${valid.length !== 1 ? "s" : ""}`);
  };

  /* ── Import attendees ── */
  const handleImportEvent = (evId) => {
    const ev = events?.find(e => e.id === evId);
    if (!ev) return;
    const fromEvent = ev.tickets.filter(t => t.holderEmail).map(t => ({ email: t.holderEmail.toLowerCase(), name: t.holderName || t.holderEmail.split("@")[0] }));
    setEmails(e => mergeEmails(e, fromEvent));
    notify(`Imported ${fromEvent.length} attendees from ${ev.title}`);
  };

  /* ── SEND — uses /api/email/blast ── */
  const handleSend = async () => {
    if (!subject.trim()) { notify("Subject is required", "error"); return; }
    if (emails.length === 0) { notify("Add at least one recipient", "error"); return; }
    setSendError(""); setSending(true); setSendProgress(0); setShowPreview(false);
    const body = bodyMode === "html" ? htmlBody : richBody;
    try {
      // Animate progress while waiting
      const ticker = setInterval(() => setSendProgress(p => Math.min(p + 3, 85)), 200);
      const result = await sendBlast({ recipients: emails, subject, htmlBody: body, fromName: senderName, fromEmail: senderEmail });
      clearInterval(ticker);
      setSendProgress(100);
      const isMocked = result.mocked;
      const blast = {
        id: genId("BL"), ts: Date.now(), subject, recipients: emails.length,
        sent: result.sent, failed: result.failed, senderName, senderEmail,
        orgId: org?.id || user?.id, provider: result.provider, mocked: isMocked,
        preview: body.replace(/<[^>]+>/g, "").slice(0, 120),
      };
      saveHistory([blast, ...blastHistory]);
      setEmails([]); setSubject(""); setActiveTab("history");
      if (isMocked) {
        notify(`📭 Simulated blast to ${result.sent} recipients — configure a real provider in Settings to send for real.`, "info");
      } else {
        notify(`✅ Sent to ${result.sent}${result.failed ? ` (${result.failed} failed)` : ""} via ${result.provider}`, "success");
      }
    } catch (e) {
      setSendError(e.message);
      notify("Blast failed: " + e.message, "error");
    } finally {
      setSending(false);
      setTimeout(() => setSendProgress(0), 1500);
    }
  };

  /* ── Save email config to backend ── */
  const saveEmailConfig = async () => {
    setConfigSaving(true);
    try {
      const result = await configureEmailProvider({ provider: emailProvider, resendKey, brevoKey, sesUrl: sesEndpoint, sesKey });
      setBackendStatus(result);
      setBackendOnline(true);
      notify("✅ Email settings saved and applied to backend!");
    } catch (e) {
      notify("Failed to save settings: " + e.message + " — is the backend running?", "error");
    } finally {
      setConfigSaving(false);
    }
  };

  const savePayConfig = () => {
    window._evPayCfg = { provider: payProvider, paystackKey, flwKey };
    notify("Payment settings saved!");
  };

  /* ── Helpers ── */
  const mergeEmails = (existing, incoming) => {
    const map = new Map(existing.map(e => [e.email, e]));
    for (const item of incoming) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) map.set(item.email, item);
    }
    return [...map.values()];
  };

  const myEvents = events?.filter(e => !org || e.orgId === org.id) || [];
  const getBody = () => bodyMode === "html" ? htmlBody : richBody;

  /* ── Backend status banner ── */
  const StatusBanner = () => {
    if (backendOnline === null) return (
      <div style={{ padding:"10px 16px", borderRadius:10, background:T.surface, border:`1px solid ${T.border}`, fontSize:12, color:T.muted, display:"flex", alignItems:"center", gap:8 }}>
        <div className="spin" style={{ width:12, height:12, border:`2px solid ${T.border}`, borderTopColor:T.accent, borderRadius:"50%", flexShrink:0 }}/>
        Checking backend status…
      </div>
    );
    if (!backendOnline) return (
      <div style={{ padding:"12px 16px", borderRadius:10, background:T.danger+"15", border:`1px solid ${T.danger+"40"}`, fontSize:13, color:T.danger }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <AlertCircle size={14}/>
          <strong>Backend not running</strong>
        </div>
        <p style={{ color:T.muted, fontSize:12, lineHeight:1.6 }}>
          Start the backend server first: <code style={{ background:T.surface, padding:"1px 6px", borderRadius:4, fontFamily:"monospace" }}>cd backend && npm start</code><br/>
          Then refresh this page. Without the backend, <strong>no emails will be sent.</strong>
        </p>
        <button onClick={refreshStatus} style={{ marginTop:8, fontSize:12, color:T.accentL, background:"none", border:"none", cursor:"pointer", fontWeight:700 }}>
          Retry connection →
        </button>
      </div>
    );
    const isLive = backendStatus && !backendStatus.mocked;
    return (
      <div style={{ padding:"10px 16px", borderRadius:10, background:isLive?T.success+"10":T.gold+"10", border:`1px solid ${isLive?T.success+"40":T.gold+"40"}`, fontSize:12, display:"flex", alignItems:"center", gap:8, justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:isLive?T.success:T.gold }} className="live-dot"/>
          <span style={{ color:isLive?T.success:T.gold, fontWeight:700 }}>
            {isLive ? `Backend live · ${backendStatus.provider} provider` : "Backend connected · Simulation mode"}
          </span>
        </div>
        {!isLive && (
          <button onClick={()=>setActiveTab("settings")} style={{ fontSize:11, color:T.accentL, background:"none", border:"none", cursor:"pointer", fontWeight:700 }}>
            Configure provider →
          </button>
        )}
      </div>
    );
  };

  const tabBtn = (id, label, Icon) => (
    <button key={id} onClick={() => setActiveTab(id)}
      style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10, border:"none",
        fontWeight:700, fontSize:13, cursor:"pointer", transition:"all .15s",
        background: activeTab === id ? T.accent+"25" : "transparent",
        color: activeTab === id ? T.accentL : T.muted }}>
      <Icon size={14}/>{label}
    </button>
  );

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:mobile?"16px":"32px 24px" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:14 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${T.accent},${T.gold})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Zap size={20} color="white"/>
            </div>
            <h1 className="outfit" style={{ fontSize:24, fontWeight:800, color:T.text }}>Email Blast</h1>
          </div>
          <p style={{ color:T.muted, fontSize:13 }}>Upload a list · AI-clean it · compose · send via your backend</p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["compose","Compose",Send],["history","History",Clock],["settings","Settings",Settings]].map(([id,label,Icon]) => tabBtn(id,label,Icon))}
        </div>
      </div>

      {/* Backend status banner - always visible */}
      <div style={{ marginBottom:20 }}><StatusBanner/></div>

      {/* ════ COMPOSE ════ */}
      {activeTab === "compose" && (
        <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 320px", gap:20, alignItems:"start" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Recipients */}
            <Card style={{ padding:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:T.text }}>Recipients</h3>
                <Bdg color={emails.length > 0 ? "green" : "gray"}>{emails.length} contacts</Bdg>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:8 }}>Upload Excel / CSV</label>
                <div style={{ display:"flex", gap:8 }}>
                  <div onClick={() => fileRef.current?.click()}
                    style={{ flex:1, border:`2px dashed ${T.accent+"50"}`, borderRadius:12, padding:"14px 18px",
                      display:"flex", alignItems:"center", gap:10, cursor:"pointer", background:T.accent+"06" }}>
                    <Upload size={16} style={{ color:T.accentL, flexShrink:0 }}/>
                    <div>
                      <p style={{ fontSize:13, color:T.text, fontWeight:600 }}>{uploading?"Parsing…":"Click to upload .xlsx / .csv"}</p>
                      <p style={{ fontSize:11, color:T.muted }}>SheetJS parses client-side — no server needed</p>
                    </div>
                    {uploading && <div className="spin" style={{ width:16, height:16, border:`2px solid ${T.border}`, borderTopColor:T.accentL, borderRadius:"50%", flexShrink:0 }}/>}
                  </div>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
                    onChange={e => { handleExcelUpload(e.target.files[0]); e.target.value=""; }}/>
                  <button onClick={handleAiClean} disabled={aiCleaning || uploadedRows.length===0}
                    style={{ padding:"0 16px", borderRadius:12, border:`1px solid ${T.accent+"50"}`,
                      background:T.accent+"15", color:T.accentL, fontWeight:700, fontSize:12,
                      cursor:aiCleaning || uploadedRows.length===0?"not-allowed":"pointer",
                      opacity:uploadedRows.length===0?0.4:1, display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
                    {aiCleaning ? <div className="spin" style={{ width:14, height:14, border:`2px solid ${T.border}`, borderTopColor:T.accentL, borderRadius:"50%" }}/> : <Sparkles size={13}/>}
                    AI Clean
                  </button>
                </div>
                {uploadedRows.length > 0 && (
                  <p style={{ fontSize:11, color:T.muted, marginTop:6 }}>
                    📄 {uploadedRows.length} rows · columns: {Object.keys(uploadedRows[0]||{}).join(", ")}
                  </p>
                )}
              </div>

              {myEvents.length > 0 && (
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:8 }}>Import from Event Attendees</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {myEvents.slice(0,5).map(ev => (
                      <button key={ev.id} onClick={() => handleImportEvent(ev.id)}
                        style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${T.border}`,
                          background:"transparent", color:T.muted, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                        <Calendar size={11}/>{ev.title.slice(0,22)}{ev.title.length>22?"…":""} ({ev.tickets.filter(t=>t.holderEmail).length})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:8 }}>Type or Paste Emails</label>
                <textarea value={manualInput} onChange={e=>setManualInput(e.target.value)}
                  placeholder={"john@example.com\nJane Doe <jane@example.com>\npaste, separate, or newline…"}
                  rows={3} style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:T.surface,
                    border:`1px solid ${T.border}`, color:T.text, fontSize:13, fontFamily:"inherit", resize:"vertical" }}/>
                <Btn sz="sm" style={{ marginTop:8 }} onClick={handleManualAdd} icon={<Plus size={13}/>}>Add to List</Btn>
              </div>

              {emails.length > 0 && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em" }}>Recipient List</label>
                    <button onClick={()=>setEmails([])} style={{ background:"none", border:"none", color:T.danger, fontSize:12, cursor:"pointer", fontWeight:600 }}>Clear all</button>
                  </div>
                  <div style={{ maxHeight:180, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
                    {emails.map((rec,i) => (
                      <div key={rec.email} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", borderRadius:8, background:T.surface, border:`1px solid ${T.border}` }}>
                        <div style={{ width:26, height:26, borderRadius:"50%", background:T.accent+"25", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:T.accentL, flexShrink:0 }}>
                          {(rec.name||rec.email)[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12, color:T.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{rec.name||rec.email.split("@")[0]}</p>
                          <p style={{ fontSize:11, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{rec.email}</p>
                        </div>
                        <button onClick={()=>setEmails(e=>e.filter((_,j)=>j!==i))} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", padding:2, flexShrink:0 }}>
                          <X size={12}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Compose */}
            <Card style={{ padding:24 }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:16 }}>Compose Email</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <Inp label="From Name" value={senderName} onChange={setSenderName} placeholder="Your Name or Company"/>
                <Inp label="From Email" type="email" value={senderEmail} onChange={setSenderEmail} placeholder="hello@yourcompany.com"/>
                <Inp label="Subject" value={subject} onChange={setSubject} placeholder="Your email subject line…" required/>

                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:8 }}>Email Body</label>
                  <div style={{ display:"flex", gap:4, marginBottom:10, padding:4, background:T.surface, borderRadius:10, width:"fit-content" }}>
                    {[["rich","Rich"],["html","HTML"],["plain","Plain"]].map(([m,l]) => (
                      <button key={m} onClick={()=>setBodyMode(m)}
                        style={{ padding:"5px 14px", borderRadius:8, border:"none", fontWeight:700, fontSize:12,
                          background:bodyMode===m?T.card:"transparent", color:bodyMode===m?T.text:T.muted, cursor:"pointer" }}>{l}</button>
                    ))}
                  </div>

                  {bodyMode==="rich" && (
                    <div>
                      <div style={{ display:"flex", gap:4, marginBottom:6, padding:"6px 8px", background:T.surface,
                        borderRadius:"10px 10px 0 0", border:`1px solid ${T.border}`, borderBottom:"none", flexWrap:"wrap" }}>
                        {[["<strong>","</strong>","B",{fontWeight:900}],["<em>","</em>","I",{fontStyle:"italic"}],["<u>","</u>","U",{textDecoration:"underline"}],["<h2>","</h2>","H2",{fontWeight:800,fontSize:11}],["<p>","</p>","¶",{}],["<br/>","","↵",{}]].map(([open,close,label,style]) => (
                          <button key={label} onClick={()=>{const sel=window.getSelection()?.toString()||"";setRichBody(b=>b+open+sel+close);}}
                            style={{ padding:"3px 9px", borderRadius:6, border:`1px solid ${T.border}`, background:"transparent", color:T.text, fontSize:12, cursor:"pointer", ...style }}>
                            {label}
                          </button>
                        ))}
                        <span style={{ fontSize:11, color:T.muted, alignSelf:"center", marginLeft:4 }}>Use {"{name}"} for personalisation</span>
                      </div>
                      <textarea value={richBody} onChange={e=>setRichBody(e.target.value)} rows={10}
                        placeholder="Write your email in HTML or plain text. Use {name} to personalise."
                        style={{ width:"100%", padding:"12px 14px", borderRadius:"0 0 10px 10px", background:T.surface,
                          border:`1px solid ${T.border}`, borderTop:"none", color:T.text, fontSize:13, fontFamily:"monospace", resize:"vertical" }}/>
                    </div>
                  )}
                  {bodyMode==="html" && (
                    <textarea value={htmlBody} onChange={e=>setHtmlBody(e.target.value)} rows={12}
                      placeholder="Paste raw HTML here…"
                      style={{ width:"100%", padding:"12px 14px", borderRadius:10, background:T.surface, border:`1px solid ${T.border}`, color:T.text, fontSize:12, fontFamily:"monospace", resize:"vertical" }}/>
                  )}
                  {bodyMode==="plain" && (
                    <textarea value={richBody.replace(/<[^>]+>/g,"")} onChange={e=>setRichBody(e.target.value)} rows={10}
                      placeholder="Plain text email…"
                      style={{ width:"100%", padding:"12px 14px", borderRadius:10, background:T.surface, border:`1px solid ${T.border}`, color:T.text, fontSize:13, fontFamily:"inherit", resize:"vertical" }}/>
                  )}
                </div>
              </div>

              {sendError && (
                <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10, background:T.danger+"15", border:`1px solid ${T.danger+"30"}`, fontSize:13, color:T.danger }}>
                  <strong>Send failed:</strong> {sendError}
                </div>
              )}

              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <Btn v="secondary" onClick={()=>setShowPreview(true)} disabled={!subject||!getBody()}>Preview</Btn>
                <Btn full onClick={handleSend} disabled={sending||emails.length===0||!subject.trim()||!backendOnline}
                  icon={<Send size={14}/>}>
                  {sending ? `Sending… ${sendProgress}%` : `Send to ${emails.length} recipient${emails.length!==1?"s":""}`}
                </Btn>
              </div>
              {!backendOnline && backendOnline !== null && (
                <p style={{ fontSize:12, color:T.danger, marginTop:8, textAlign:"center" }}>
                  Start the backend server to enable sending.
                </p>
              )}
              {sending && (
                <div style={{ marginTop:14 }}>
                  <div style={{ height:6, borderRadius:100, background:T.border }}>
                    <div style={{ height:"100%", borderRadius:100, background:GA, width:`${sendProgress}%`, transition:"width .3s" }}/>
                  </div>
                  <p style={{ fontSize:11, color:T.muted, marginTop:5 }}>Sending… {sendProgress}% — do not close this tab</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right sidebar */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Card style={{ padding:20 }}>
              <h4 style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:14 }}>Blast Stats</h4>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[["Total Blasts",blastHistory.length,T.accent],["Emails Sent",blastHistory.reduce((s,b)=>s+b.sent,0),T.success],["Ready to Send",emails.length,T.gold]].map(([l,v,c]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color:T.muted }}>{l}</span>
                    <span style={{ fontSize:16, fontWeight:800, color:c }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{ padding:20 }}>
              <h4 style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>💡 Tips</h4>
              {[["📊 Messy Excel?","Upload any file, click AI Clean — Claude extracts & fixes emails automatically."],
                ["{name} tag","Personalise greetings for each recipient."],
                ["Import attendees","Click an event to import all registered attendees instantly."],
                ["Real sending","Add your Resend API key in Settings — free tier, 100 emails/day."],
              ].map(([t,d]) => (
                <div key={t} style={{ marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
                  <p style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:3 }}>{t}</p>
                  <p style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>{d}</p>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ════ HISTORY ════ */}
      {activeTab === "history" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:T.text }}>Send History ({blastHistory.length})</h3>
            {blastHistory.length > 0 && (
              <Btn sz="sm" v="danger" onClick={()=>{saveHistory([]);notify("History cleared");}}>
                <Trash2 size={13}/>Clear
              </Btn>
            )}
          </div>
          {blastHistory.length === 0
            ? <Card style={{ padding:60, textAlign:"center" }}><Send size={36} style={{ color:T.muted, margin:"0 auto 14px" }}/><p style={{ color:T.muted }}>No blasts sent yet.</p></Card>
            : <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {blastHistory.map(b => (
                  <Card key={b.id} style={{ padding:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <h4 style={{ fontSize:14, fontWeight:700, color:T.text }}>{b.subject}</h4>
                          {b.mocked ? <Bdg color="orange">Simulated</Bdg> : <Bdg color="green">Sent via {b.provider}</Bdg>}
                        </div>
                        <p style={{ fontSize:12, color:T.muted, marginBottom:4 }}>From: {b.senderName} · {new Date(b.ts).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"})}</p>
                        <p style={{ fontSize:12, color:T.muted, fontStyle:"italic" }}>"{b.preview}…"</p>
                      </div>
                      <div style={{ display:"flex", gap:16, flexShrink:0, alignItems:"center" }}>
                        <div style={{ textAlign:"center" }}><p className="outfit" style={{ fontSize:20, fontWeight:800, color:T.success }}>{b.sent}</p><p style={{ fontSize:10, color:T.muted }}>Sent</p></div>
                        {b.failed>0 && <div style={{ textAlign:"center" }}><p className="outfit" style={{ fontSize:20, fontWeight:800, color:T.danger }}>{b.failed}</p><p style={{ fontSize:10, color:T.muted }}>Failed</p></div>}
                        <div style={{ textAlign:"center" }}><p className="outfit" style={{ fontSize:20, fontWeight:800, color:T.accent }}>{b.recipients}</p><p style={{ fontSize:10, color:T.muted }}>Total</p></div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
          }
        </div>
      )}

      {/* ════ SETTINGS ════ */}
      {activeTab === "settings" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <Card style={{ padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:12 }}>
              <div>
                <h3 style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:4 }}>Email Provider</h3>
                <p style={{ fontSize:12, color:T.muted }}>
                  {backendOnline
                    ? "Settings are saved directly to the backend — no restart needed."
                    : "⚠️ Backend is offline. Start it first, then save."}
                </p>
              </div>
              <Btn sz="sm" onClick={saveEmailConfig} disabled={configSaving||!backendOnline}>
                {configSaving ? "Saving…" : "Save & Apply"}
              </Btn>
            </div>

            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
              {[["mock","🔇 Simulation"],["resend","✉️ Resend.com"],["brevo","📬 Brevo"],["ses","⚙️ AWS SES"]].map(([id,label]) => (
                <button key={id} onClick={()=>setEmailProvider(id)}
                  style={{ padding:"8px 16px", borderRadius:10, border:`1px solid ${emailProvider===id?T.accent:T.border}`,
                    background:emailProvider===id?T.accent+"20":"transparent",
                    color:emailProvider===id?T.accentL:T.muted, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  {label}
                </button>
              ))}
            </div>

            {emailProvider==="mock" && (
              <div style={{ padding:14, borderRadius:12, background:T.gold+"10", border:`1px solid ${T.gold+"30"}` }}>
                <p style={{ fontSize:13, color:T.gold, fontWeight:700, marginBottom:6 }}>⚠️ Simulation Mode</p>
                <p style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>
                  Emails are <strong>logged to the backend console only — not delivered</strong>. Pick Resend.com for the easiest real sending (free 100/day, no domain setup needed for testing).
                </p>
              </div>
            )}
            {emailProvider==="resend" && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ padding:12, borderRadius:10, background:T.success+"10", border:`1px solid ${T.success+"30"}` }}>
                  <p style={{ fontSize:11, color:T.muted, lineHeight:1.7 }}>1. Go to <strong>resend.com</strong> → API Keys → Create Key<br/>2. Paste it below and click Save & Apply — no restart needed.</p>
                </div>
                <Inp label="Resend API Key" value={resendKey} onChange={setResendKey} placeholder="re_xxxxxxxxxxxxxxxxxxxx"/>
                {resendKey && <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:8, background:T.success+"10", border:`1px solid ${T.success+"30"}` }}>
                  <CheckCircle size={13} style={{ color:T.success }}/><span style={{ fontSize:12, color:T.success, fontWeight:700 }}>Key entered — save to activate</span>
                </div>}
              </div>
            )}
            {emailProvider==="brevo" && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ padding:12, borderRadius:10, background:T.info+"10", border:`1px solid ${T.info+"30"}` }}>
                  <p style={{ fontSize:11, color:T.muted, lineHeight:1.7 }}>1. Go to <strong>brevo.com</strong> → SMTP & API → API Keys → Create<br/>2. Verify your sender address under Senders & Domains</p>
                </div>
                <Inp label="Brevo API Key" value={brevoKey} onChange={setBrevoKey} placeholder="xkeysib-xxxxxxxxxxxx"/>
              </div>
            )}
            {emailProvider==="ses" && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <Inp label="API Gateway URL" value={sesEndpoint} onChange={setSesEndpoint} placeholder="https://xxxx.execute-api.region.amazonaws.com/prod/send"/>
                <Inp label="API Key (optional)" value={sesKey} onChange={setSesKey} placeholder="your-x-api-key-here"/>
              </div>
            )}
          </Card>

          <Card style={{ padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <h3 style={{ fontSize:15, fontWeight:700, color:T.text }}>Payment Provider</h3>
                <p style={{ fontSize:12, color:T.muted }}>Used for ticket purchases on public event pages.</p>
              </div>
              <Btn sz="sm" v="gold" onClick={savePayConfig}>Save</Btn>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
              {[["none","🔓 Free Tickets"],["bank","🏦 Bank Transfer"],["paystack","💳 Paystack"],["flutterwave","🦋 Flutterwave"]].map(([id,label]) => (
                <button key={id} onClick={()=>setPayProvider(id)}
                  style={{ padding:"8px 16px", borderRadius:10, border:`1px solid ${payProvider===id?T.gold:T.border}`,
                    background:payProvider===id?T.gold+"20":"transparent", color:payProvider===id?T.gold:T.muted, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  {label}
                </button>
              ))}
            </div>
            {payProvider==="paystack" && <Inp label="Paystack Public Key" value={paystackKey} onChange={setPaystackKey} placeholder="pk_live_xxxxxxxxxxxx"/>}
            {payProvider==="flutterwave" && <Inp label="Flutterwave Public Key" value={flwKey} onChange={setFlwKey} placeholder="FLWPUBK-xxxxxxxxxxxx-X"/>}
            {payProvider==="bank" && (
              <div style={{ padding:12, borderRadius:10, background:T.gold+"10", border:`1px solid ${T.gold+"30"}`, fontSize:12, color:T.muted, lineHeight:1.7 }}>
                Attendees see your bank details at checkout. After payment confirmation, issue tickets manually in Event Detail → Issue Ticket.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Preview modal */}
      <Modal open={showPreview} onClose={()=>setShowPreview(false)} title="Email Preview" width={700}>
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
            <div style={{ padding:"8px 14px", borderRadius:10, background:T.surface, border:`1px solid ${T.border}` }}>
              <p style={{ fontSize:10, color:T.muted, textTransform:"uppercase", marginBottom:2 }}>From</p>
              <p style={{ fontSize:13, color:T.text, fontWeight:600 }}>{senderName} &lt;{senderEmail}&gt;</p>
            </div>
            <div style={{ padding:"8px 14px", borderRadius:10, background:T.surface, border:`1px solid ${T.border}`, flex:1 }}>
              <p style={{ fontSize:10, color:T.muted, textTransform:"uppercase", marginBottom:2 }}>Subject</p>
              <p style={{ fontSize:13, color:T.text, fontWeight:600 }}>{subject||"(no subject)"}</p>
            </div>
          </div>
          <div style={{ padding:"4px 14px", borderRadius:10, background:T.surface, border:`1px solid ${T.border}`, marginBottom:12 }}>
            <p style={{ fontSize:10, color:T.muted, textTransform:"uppercase", padding:"8px 0 4px" }}>To ({emails.length})</p>
            <p style={{ fontSize:12, color:T.muted, paddingBottom:8 }}>{emails.slice(0,5).map(e=>e.name||e.email).join(", ")}{emails.length>5?` + ${emails.length-5} more`:""}</p>
          </div>
        </div>
        <div style={{ border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"10px 16px", background:T.surface, borderBottom:`1px solid ${T.border}`, fontSize:11, color:T.muted }}>
            📧 Preview for: {emails[0]?.name||"Sample"} &lt;{emails[0]?.email||"sample@example.com"}&gt;
          </div>
          <div style={{ padding:24, background:"#fff", minHeight:200, color:"#1a1a1a" }}>
            <div dangerouslySetInnerHTML={{ __html: getBody().replace(/{name}/g,emails[0]?.name||"Friend").replace(/{email}/g,emails[0]?.email||"") }}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <Btn v="secondary" full onClick={()=>setShowPreview(false)}>Edit</Btn>
          <Btn full onClick={()=>{setShowPreview(false);handleSend();}} icon={<Send size={14}/>}>
            Send to {emails.length} Recipient{emails.length!==1?"s":""}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
