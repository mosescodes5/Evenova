/**
 * WhatsAppBlast.jsx — Evenova Admin: WhatsApp Mass Messaging
 *
 * Features:
 *  • Add recipients manually or paste a bulk list (name, phone)
 *  • AI-generated message body
 *  • Live send log with per-recipient status
 *  • Blast history stored in localStorage
 *  • Uses backend POST /api/whatsapp/blast
 */

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle, CheckCircle, ChevronDown, ChevronUp,
  Clock, MessageCircle, Plus, Send, Settings,
  Sparkles, Trash2, Users, X, Zap,
} from "lucide-react";
import { T } from "../../styles/theme.js";
import { Bdg, Btn, Card, Inp } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";

const API   = import.meta.env.VITE_API_URL || "http://localhost:4000";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const s = {
  label:   { fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6, display: "block" },
  log:     { fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, color: T.muted, maxHeight: 200, overflowY: "auto", padding: 12, background: "#0a0a14", borderRadius: 10, border: `1px solid ${T.border}` },
  logLine: (lvl) => ({ color: lvl === "success" ? T.success : lvl === "error" ? T.danger : lvl === "warn" ? T.gold : T.muted }),
};

const DEFAULT_MESSAGE = `Hi {name} 👋

This is Evenova — Nigeria's event management and ticketing platform.

We have exciting events coming up near you! 🎟

Reply *STOP* to unsubscribe.`;

export default function WhatsAppBlast({ user, notify }) {
  const { mobile } = useMedia();

  const [tab, setTab] = useState("compose"); // compose | settings | history

  // ── Recipients ────────────────────────────────────────────
  const [recipients,  setRecipients]  = useState([]);
  const [addName,     setAddName]     = useState("");
  const [addPhone,    setAddPhone]    = useState("");
  const [bulkText,    setBulkText]    = useState("");
  const [showBulk,    setShowBulk]    = useState(false);

  // ── Message ───────────────────────────────────────────────
  const [message,     setMessage]     = useState(DEFAULT_MESSAGE);
  const [delayMs,     setDelayMs]     = useState(1500);

  // ── AI ────────────────────────────────────────────────────
  const [aiPrompt,    setAiPrompt]    = useState("");
  const [aiLoading,   setAiLoading]   = useState(false);

  // ── Send ──────────────────────────────────────────────────
  const [sending,     setSending]     = useState(false);
  const [logs,        setLogs]        = useState([]);
  const [result,      setResult]      = useState(null);

  // ── Status ────────────────────────────────────────────────
  const [waStatus,    setWaStatus]    = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // ── History ───────────────────────────────────────────────
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("evenova_wa_history") || "[]"); }
    catch { return []; }
  });
  const saveHistory = (h) => { setHistory(h); localStorage.setItem("evenova_wa_history", JSON.stringify(h)); };

  const logRef = useRef();
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // ── Add recipient ─────────────────────────────────────────
  const addRecipient = () => {
    if (!addPhone.trim()) return notify?.("Phone number is required", "error");
    const digits = addPhone.replace(/\D/g, "");
    if (digits.length < 10) return notify?.("Invalid phone number", "error");
    if (recipients.find(r => r.phone.replace(/\D/g,"") === digits)) return notify?.("Already added", "warn");
    setRecipients(prev => [...prev, {
      id:    Date.now(),
      name:  addName.trim() || "Friend",
      phone: addPhone.trim(),
    }]);
    setAddName(""); setAddPhone("");
  };

  // ── Bulk parse ────────────────────────────────────────────
  const parseBulk = () => {
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    let added = 0;
    for (const line of lines) {
      const parts = line.split(/[,\t]+/).map(p => p.trim());
      let phone = "", name = "";
      if (parts.length === 1) { phone = parts[0]; }
      else { [name, phone] = parts; }
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) continue;
      if (recipients.find(r => r.phone.replace(/\D/g,"") === digits)) continue;
      setRecipients(prev => [...prev, { id: Date.now() + added, name: name || "Friend", phone }]);
      added++;
    }
    setBulkText(""); setShowBulk(false);
    notify?.(`Added ${added} recipients`, "success");
  };

  // ── AI message ────────────────────────────────────────────
  const generateAiMessage = async () => {
    if (!aiPrompt.trim()) return notify?.("Describe what the message should say", "warn");
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `Write a short WhatsApp marketing message for Evenova (a Nigerian event management and ticketing platform).

Context: ${aiPrompt}

Requirements:
- Use {name} as a placeholder for the recipient's name
- Plain text only — no HTML, no markdown headers
- Warm, conversational Nigerian tone
- Max 200 words
- End with "Reply STOP to unsubscribe."
- Return ONLY the message text, no preamble`
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      if (text) { setMessage(text); notify?.("✨ Message ready", "success"); }
      else notify?.("AI returned empty response", "warn");
    } catch (err) {
      notify?.("AI generation failed: " + err.message, "error");
    }
    setAiLoading(false);
  };

  // ── Check WhatsApp status ─────────────────────────────────
  const checkStatus = async () => {
    setStatusLoading(true);
    try {
      const res  = await fetch(`${API}/api/whatsapp/status`);
      const data = await res.json();
      setWaStatus(data);
    } catch { setWaStatus({ configured: false, error: "Backend not reachable" }); }
    setStatusLoading(false);
  };

  // ── Send blast ────────────────────────────────────────────
  const sendBlast = async () => {
    if (!recipients.length) return notify?.("Add at least one recipient", "error");
    if (!message.trim())    return notify?.("Message is required", "error");

    setSending(true);
    setLogs([]);
    setResult(null);

    const addLog = (msg, lvl = "info") =>
      setLogs(prev => [...prev, { msg, lvl, ts: new Date().toLocaleTimeString() }]);

    addLog(`Starting WhatsApp blast to ${recipients.length} recipients…`);

    try {
      const res = await fetch(`${API}/api/whatsapp/blast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: recipients.map(r => ({ phone: r.phone, name: r.name })),
          message,
          delayMs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addLog(`Failed: ${data.error || res.status}`, "error");
        notify?.("Blast failed: " + (data.error || res.status), "error");
        setSending(false);
        return;
      }

      // Show per-recipient results from backend response
      if (data.errors?.length) {
        data.errors.forEach(e => addLog(`  ✗ ${e.name || e.phone}: ${e.error}`, "error"));
      }
      addLog(`─── Done: ${data.sent} sent, ${data.failed} failed ───`,
        data.failed === 0 ? "success" : "warn");

      const r = { sent: data.sent, failed: data.failed, total: data.total,
        ts: new Date().toISOString(), preview: message.substring(0, 60) };
      setResult(r);
      saveHistory([r, ...history].slice(0, 50));
      if (data.sent > 0) notify?.(`Sent ${data.sent}/${data.total} WhatsApp messages`, "success");

    } catch (err) {
      addLog(`Network error: ${err.message}`, "error");
      notify?.("Blast failed: " + err.message, "error");
    }

    setSending(false);
  };

  const charCount = message.length;
  const msgCount  = Math.ceil(charCount / 160); // WhatsApp has no SMS segments but useful info

  return (
    <div style={{ padding: mobile ? 16 : 28, maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ background: "#25D36622", padding: 8, borderRadius: 10 }}>
            <MessageCircle size={20} color="#25D366" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text }}>WhatsApp Blast</h2>
            <p style={{ fontSize: 13, color: T.muted }}>Send personalised WhatsApp messages to multiple recipients</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0a0a14", padding: 4, borderRadius: 12, width: "fit-content" }}>
        {[
          { id: "compose",  label: "Compose",  icon: <MessageCircle size={14}/> },
          { id: "settings", label: "Setup",    icon: <Settings size={14}/> },
          { id: "history",  label: "History",  icon: <Clock size={14}/> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: tab === t.id ? "#25D366" : "transparent",
              color:      tab === t.id ? "white"   : T.muted,
              transition: "all .18s" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── COMPOSE TAB ── */}
      {tab === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 320px", gap: 20 }}>

          {/* Left: Message */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* AI Generator */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Sparkles size={16} color={T.gold} />
                <span style={{ ...s.label, marginBottom: 0 }}>AI Message Generator</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Inp value={aiPrompt} onChange={setAiPrompt}
                    placeholder='e.g. "Promote upcoming Lagos tech conference"' />
                </div>
                <Btn v="gold" onClick={generateAiMessage} disabled={aiLoading}
                  icon={<Sparkles size={14}/>}>
                  {aiLoading ? "Writing…" : "Generate"}
                </Btn>
              </div>
            </Card>

            {/* Message Body */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={s.label}>Message</label>
                <span style={{ fontSize: 11, color: charCount > 1000 ? T.danger : T.muted }}>
                  {charCount} chars
                </span>
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={10}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 13,
                  color: T.text, background: T.surface, border: `1px solid ${T.border}`,
                  fontFamily: "inherit", resize: "vertical", lineHeight: 1.7 }}
              />
              <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                Use <code style={{color:"#25D366"}}>{"{name}"}</code> to personalise each message with the recipient's name.
              </p>

              {/* Preview */}
              {recipients.length > 0 && (
                <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: "#0a0a14", border: `1px solid ${T.border}` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8 }}>PREVIEW (for {recipients[0]?.name})</p>
                  <div style={{ background: "#1a2e1a", borderRadius: "12px 12px 12px 0", padding: "10px 14px",
                    fontSize: 13, color: "#e2e8f0", lineHeight: 1.7, whiteSpace: "pre-wrap",
                    maxWidth: 320, borderLeft: `3px solid #25D366` }}>
                    {message.replace(/{name}/gi, recipients[0]?.name || "Friend")}
                  </div>
                </div>
              )}
            </Card>

            {/* Send Settings */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Zap size={16} color={T.gold} />
                <span style={s.label}>Send Settings</span>
              </div>
              <Inp
                label="Delay between messages (ms)"
                type="number"
                value={String(delayMs)}
                onChange={v => setDelayMs(Math.max(1000, parseInt(v) || 1500))}
                hint={delayMs < 1000 ? "⚠ Too fast — Meta may rate limit you" : ""}
              />
              <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                Meta allows ~80 messages/minute on free tier. Keep delay ≥ 1.5s.
              </p>
            </Card>

            {/* Send Button */}
            <Btn v="primary" sz="lg" full onClick={sendBlast} disabled={sending}
              style={{ background: sending ? T.border : "linear-gradient(135deg,#25D366,#128C7E)" }}
              icon={<Send size={16}/>}>
              {sending ? `Sending…` : `Send to ${recipients.length} Recipients`}
            </Btn>

            {/* Live log */}
            {logs.length > 0 && (
              <Card style={{ padding: 16 }}>
                <p style={{ ...s.label, marginBottom: 8 }}>Send Log</p>
                <div ref={logRef} style={s.log}>
                  {logs.map((l, i) => (
                    <div key={i} style={s.logLine(l.lvl)}>
                      <span style={{ color: T.border }}>[{l.ts}] </span>{l.msg}
                    </div>
                  ))}
                </div>
                {result && (
                  <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8,
                    background: result.failed === 0 ? T.success + "18" : T.gold + "18",
                    border: `1px solid ${result.failed === 0 ? T.success : T.gold}44`,
                    display: "flex", alignItems: "center", gap: 8 }}>
                    {result.failed === 0
                      ? <CheckCircle size={16} color={T.success} />
                      : <AlertCircle size={16} color={T.gold} />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                      {result.sent} sent · {result.failed} failed · {result.total} total
                    </span>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Right: Recipients */}
          <div>
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ ...s.label, marginBottom: 0 }}>Recipients ({recipients.length})</p>
                <button onClick={() => setShowBulk(b => !b)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#25D366", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  {showBulk ? <ChevronUp size={13}/> : <ChevronDown size={13}/>} Bulk add
                </button>
              </div>

              {showBulk && (
                <div style={{ marginBottom: 16 }}>
                  <textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    rows={5}
                    placeholder={"One per line:\n08012345678\nJohn,08012345678\nJane,08098765432"}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 12,
                      color: T.text, background: T.surface, border: `1px solid ${T.border}`,
                      fontFamily: "monospace", resize: "vertical" }}
                  />
                  <Btn v="secondary" sz="sm" onClick={parseBulk} style={{ marginTop: 6 }}>Parse & Add</Btn>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                <Inp placeholder="Name (optional)" value={addName}  onChange={setAddName}  />
                <Inp placeholder="Phone *"          value={addPhone} onChange={setAddPhone} type="tel" />
                <Btn v="secondary" sz="sm" full onClick={addRecipient} icon={<Plus size={13}/>}>Add Recipient</Btn>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                {recipients.length === 0 && (
                  <p style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: "20px 0" }}>
                    No recipients yet — add some above
                  </p>
                )}
                {recipients.map(r => (
                  <div key={r.id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 10px", borderRadius: 8, background: T.surface,
                      border: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#25D36622",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <MessageCircle size={12} color="#25D366" />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{r.name}</p>
                        <p style={{ fontSize: 11, color: T.muted }}>{r.phone}</p>
                      </div>
                    </div>
                    <button onClick={() => setRecipients(prev => prev.filter(x => x.id !== r.id))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.danger, padding: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {recipients.length > 0 && (
                <button onClick={() => setRecipients([])}
                  style={{ marginTop: 10, fontSize: 11, color: T.danger, background: "none", border: "none",
                    cursor: "pointer", textDecoration: "underline" }}>
                  Clear all
                </button>
              )}

              {/* Free tier reminder */}
              <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8,
                background: T.gold + "10", border: `1px solid ${T.gold}33` }}>
                <p style={{ fontSize: 11, color: T.gold, lineHeight: 1.5 }}>
                  ⚠ Meta free tier: 1,000 conversations/month. Each new recipient = 1 conversation.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── SETUP TAB ── */}
      {tab === "settings" && (
        <Card style={{ padding: 28, maxWidth: 560 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 20 }}>WhatsApp Cloud API Setup</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "#25D36614", border: "1px solid #25D36644" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#25D366", marginBottom: 4 }}>
                📋 How to get your WhatsApp API credentials
              </p>
              <ol style={{ fontSize: 12, color: T.muted, paddingLeft: 18, lineHeight: 2.2 }}>
                <li>Go to <strong style={{color:T.text}}>developers.facebook.com</strong> → Create App → Business</li>
                <li>Add the <strong style={{color:T.text}}>WhatsApp</strong> product to your app</li>
                <li>Go to WhatsApp → <strong style={{color:T.text}}>Getting Started</strong></li>
                <li>Copy your <strong style={{color:T.text}}>Phone Number ID</strong></li>
                <li>For permanent token: Meta Business Suite → <strong style={{color:T.text}}>System Users</strong> → Generate token with <code style={{color:"#25D366"}}>whatsapp_business_messaging</code></li>
              </ol>
            </div>

            <div style={{ padding: "14px 16px", borderRadius: 10, background: "#0a0a14", border: `1px solid ${T.border}` }}>
              <p style={{ ...s.label, marginBottom: 8 }}>backend/.env</p>
              <pre style={{ fontSize: 12, color: "#a5f3c0", fontFamily: "monospace", lineHeight: 1.8, margin: 0 }}>{`WHATSAPP_TOKEN=your_permanent_system_user_token
WHATSAPP_PHONE_ID=your_phone_number_id`}</pre>
            </div>

            <div style={{ padding: "14px 16px", borderRadius: 10, background: T.gold + "12", border: `1px solid ${T.gold}44` }}>
              <p style={{ fontSize: 12, color: T.gold, lineHeight: 1.6 }}>
                ⚠ Free tier: 1,000 conversations/month. Recipients must have messaged you first within 24 hours OR you must use an approved template message for cold outreach.
              </p>
            </div>

            <Btn v="secondary" onClick={checkStatus} disabled={statusLoading} icon={<Zap size={14}/>}>
              {statusLoading ? "Checking…" : "Check WhatsApp Status"}
            </Btn>

            {waStatus && (
              <div style={{ padding: "12px 16px", borderRadius: 8,
                background: waStatus.configured ? T.success + "18" : T.danger + "18",
                border: `1px solid ${waStatus.configured ? T.success : T.danger}44` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: waStatus.configured ? 8 : 0 }}>
                  {waStatus.configured
                    ? <CheckCircle size={15} color={T.success} />
                    : <AlertCircle size={15} color={T.danger} />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {waStatus.configured ? "WhatsApp is configured ✓" : "Not configured"}
                  </span>
                </div>
                {waStatus.configured && (
                  <div style={{ fontSize: 12, color: T.muted, paddingLeft: 23 }}>
                    <p>Token: {waStatus.tokenSet ? "✓ set" : "✗ missing"}</p>
                    <p>Phone ID: {waStatus.phoneIdSet ? "✓ set" : "✗ missing"}</p>
                    <p>Free quota: {waStatus.freeQuota}</p>
                  </div>
                )}
                {!waStatus.configured && (
                  <p style={{ fontSize: 12, color: T.muted, paddingLeft: 23, marginTop: 4 }}>
                    {waStatus.error || "Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in your .env"}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div>
          {history.length === 0
            ? <p style={{ color: T.muted, fontSize: 13 }}>No blasts sent yet.</p>
            : history.map((h, i) => (
              <Card key={i} style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{h.preview}…</p>
                    <p style={{ fontSize: 12, color: T.muted }}>{new Date(h.ts).toLocaleString()}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Bdg color="green">{h.sent} sent</Bdg>
                    {h.failed > 0 && <Bdg color="red">{h.failed} failed</Bdg>}
                  </div>
                </div>
              </Card>
            ))
          }
        </div>
      )}
    </div>
  );
}