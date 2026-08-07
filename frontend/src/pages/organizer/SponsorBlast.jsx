/**
 * SponsorBlast.jsx  —  Evenova Admin: Sponsor Outreach
 *
 * Features:
 *  • Add sponsor companies manually or paste a list
 *  • Upload your sponsorship documentation (PDF / DOCX)
 *  • AI-generated email body (calls Anthropic via backend proxy)
 *  • Rich HTML email editor with live preview
 *  • Send via Gmail SMTP with per-send progress log
 *  • Blast history stored locally
 */

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle, Briefcase, CheckCircle, ChevronDown, ChevronUp,
  Clock, Eye, FileText, Mail, Paperclip, Plus, Send, Settings,
  Sparkles, Trash2, Upload, X, Zap,
} from "lucide-react";
import { T, GA } from "../../styles/theme.js";
import { Bdg, Btn, Card, Inp, Modal } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";

// ── Design helpers ────────────────────────────────────────
const s = {
  section:  { marginBottom: 28 },
  label:    { fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6, display: "block" },
  row:      { display: "flex", gap: 12, alignItems: "flex-start" },
  chip:     { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: T.surface, border: `1px solid ${T.border}`, color: T.text },
  log:      { fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, color: T.muted, maxHeight: 200, overflowY: "auto", padding: 12, background: "#0a0a14", borderRadius: 10, border: `1px solid ${T.border}` },
  logLine:  (lvl) => ({ color: lvl === "success" ? T.success : lvl === "error" ? T.danger : lvl === "warn" ? T.gold : T.muted }),
};

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Defaults ──────────────────────────────────────────────
const DEFAULT_SUBJECT = "Partnership Opportunity — Evenova × {company}";
const DEFAULT_BODY = `<p>Hi <strong>{name}</strong>,</p>

<p>My name is [Your Name], and I'm the founder of <strong>Evenova</strong> — Nigeria's event management and ticketing platform built to help organizers sell tickets, manage attendees, and run events efficiently.</p>

<p>We're reaching out to a select group of forward-thinking companies to explore a <strong>sponsorship partnership</strong> that puts <strong>{company}</strong> in front of thousands of event-goers across Nigeria.</p>

<h3 style="color:#7c3aed;margin:20px 0 8px">Why sponsor Evenova?</h3>
<ul>
  <li>🎟 <strong>Direct access</strong> to event organizers and attendees nationwide</li>
  <li>📣 <strong>Brand visibility</strong> on tickets, event pages, and email campaigns</li>
  <li>🤝 <strong>Custom packages</strong> designed around your marketing goals</li>
  <li>📊 <strong>Measurable reach</strong> — we share reports after every campaign</li>
</ul>

<p>I've attached our sponsorship documentation with full package details, pricing, and audience stats. Happy to jump on a quick call to walk you through it.</p>

<p>Looking forward to hearing from you.</p>

<p><strong>[Your Name]</strong><br/>
Evenova · hello.evenova@gmail.com</p>`;

export default function SponsorBlast({ org, user, notify }) {
  const { mobile } = useMedia();
  const fileRef = useRef();

  // ── Tabs ──────────────────────────────────────────────
  const [tab, setTab] = useState("compose"); // compose | settings | history

  // ── Recipients ────────────────────────────────────────
  const [companies, setCompanies]   = useState([]);
  const [addName,   setAddName]     = useState("");
  const [addEmail,  setAddEmail]    = useState("");
  const [addCompany,setAddCompany]  = useState("");
  const [bulkText,  setBulkText]    = useState("");
  const [showBulk,  setShowBulk]    = useState(false);

  // ── Compose ───────────────────────────────────────────
  const [subject,    setSubject]    = useState(DEFAULT_SUBJECT);
  const [bodyHtml,   setBodyHtml]   = useState(DEFAULT_BODY);
  const [fromName,   setFromName]   = useState(org?.name || "Evenova");
  const [fromEmail,  setFromEmail]  = useState("");
  const [delayMs,    setDelayMs]    = useState(6000);

  // ── AI ────────────────────────────────────────────────
  const [aiPrompt,   setAiPrompt]   = useState("");
  const [aiLoading,  setAiLoading]  = useState(false);

  // ── Attachments ───────────────────────────────────────
  const [attachments, setAttachments] = useState([]); // [{ filename, content(b64), contentType, sizeKb }]
  const [attUploading, setAttUploading] = useState(false);

  // ── Send ──────────────────────────────────────────────
  const [showPreview, setShowPreview] = useState(false);
  const [sending,     setSending]     = useState(false);
  const [logs,        setLogs]        = useState([]);
  const [result,      setResult]      = useState(null); // { sent, failed, total }

  // ── History ───────────────────────────────────────────
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("evenova_sponsor_history") || "[]"); }
    catch { return []; }
  });
  const saveHistory = (h) => { setHistory(h); localStorage.setItem("evenova_sponsor_history", JSON.stringify(h)); };

  // ── SMTP status ───────────────────────────────────────
  const [smtpStatus, setSmtpStatus] = useState(null); // null | { ok, message }
  const [smtpTesting, setSmtpTesting] = useState(false);

  const logRef = useRef();
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // ── Add recipient ─────────────────────────────────────
  const addCompanyRow = () => {
    if (!addEmail.trim()) return notify?.("Email is required", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmail.trim())) return notify?.("Invalid email", "error");
    if (companies.find(c => c.email === addEmail.trim())) return notify?.("Already added", "warn");
    setCompanies(prev => [...prev, {
      id:      Date.now(),
      name:    addName.trim()    || addEmail.split("@")[0],
      email:   addEmail.trim().toLowerCase(),
      company: addCompany.trim() || addEmail.split("@")[1]?.split(".")[0] || "Company",
    }]);
    setAddName(""); setAddEmail(""); setAddCompany("");
  };

  // ── Bulk parse ────────────────────────────────────────
  const parseBulk = () => {
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    let added = 0;
    for (const line of lines) {
      // Accept: email | name,email | name,email,company
      const parts = line.split(/[,\t]+/).map(p => p.trim());
      let email = "", name = "", company = "";
      if (parts.length === 1) {
        email = parts[0];
      } else if (parts.length === 2) {
        [name, email] = parts;
      } else {
        [name, email, company] = parts;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      if (companies.find(c => c.email === email)) continue;
      setCompanies(prev => [...prev, {
        id: Date.now() + added,
        name:    name    || email.split("@")[0],
        email:   email.toLowerCase(),
        company: company || email.split("@")[1]?.split(".")[0] || "Company",
      }]);
      added++;
    }
    setBulkText(""); setShowBulk(false);
    notify?.(`Added ${added} companies`, "success");
  };

  // ── File attachment ───────────────────────────────────
  const handleAttachFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachments.length + files.length > 3) {
      return notify?.("Max 3 attachments allowed", "error");
    }

    setAttUploading(true);
    for (const file of files) {
      if (file.size > 8_000_000) { notify?.(`${file.name} is too large (max 8 MB)`, "error"); continue; }
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      setAttachments(prev => [...prev, {
        filename:    file.name,
        content:     b64,
        contentType: file.type || "application/octet-stream",
        sizeKb:      Math.round(file.size / 1024),
      }]);
    }
    setAttUploading(false);
    e.target.value = "";
  };

  const removeAttachment = (filename) =>
    setAttachments(prev => prev.filter(a => a.filename !== filename));

  // ── AI template ───────────────────────────────────────
  const generateAiTemplate = async () => {
    if (!aiPrompt.trim()) return notify?.("Describe what you want the email to say", "warn");
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Write a professional HTML sponsorship outreach email body for an event platform called Evenova (a Nigerian event management and ticketing platform).

Context: ${aiPrompt}

Requirements:
- Use {name} for contact name, {company} for company name placeholders
- Return ONLY the HTML body content (no <html>/<body> tags, no preamble, no markdown)
- Professional, warm, concise — max 300 words
- Include a clear value proposition and a soft call-to-action
- Mention that documentation is attached`
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      if (text) { setBodyHtml(text); notify?.("✨ AI template ready", "success"); }
      else notify?.("AI returned an empty response", "warn");
    } catch (err) {
      notify?.("AI generation failed: " + err.message, "error");
    }
    setAiLoading(false);
  };

  // ── Test SMTP ─────────────────────────────────────────
  const testSmtp = async () => {
    setSmtpTesting(true);
    try {
      const res  = await fetch(`${API}/api/email/test-smtp`, { method: "POST" });
      const data = await res.json();
      setSmtpStatus(data);
      notify?.(data.ok ? "✅ " + data.message : "❌ " + data.error, data.ok ? "success" : "error");
    } catch { notify?.("Backend not reachable", "error"); }
    setSmtpTesting(false);
  };

  // ── Send blast ────────────────────────────────────────
  const sendBlast = async () => {
    if (!companies.length) return notify?.("Add at least one company", "error");
    if (!subject.trim())   return notify?.("Subject is required", "error");
    if (!bodyHtml.trim())  return notify?.("Email body is required", "error");

    setSending(true);
    setLogs([]);
    setResult(null);

    const addLog = (msg, lvl = "info") =>
      setLogs(prev => [...prev, { msg, lvl, ts: new Date().toLocaleTimeString() }]);

    addLog(`Starting sponsor blast to ${companies.length} companies…`, "info");
    if (attachments.length) addLog(`📎 Attaching: ${attachments.map(a => a.filename).join(", ")}`, "info");

    try {
      // Send one at a time with progress so the user can see what's happening
      let sent = 0, failed = 0;
      for (let i = 0; i < companies.length; i++) {
        const rec = companies[i];
        addLog(`[${i + 1}/${companies.length}] Sending to ${rec.company} <${rec.email}>…`);

        const personalised = bodyHtml
          .replace(/{name}/g,    rec.name    || "")
          .replace(/{email}/g,   rec.email   || "")
          .replace(/{company}/g, rec.company || "");

        const personalisedSubject = subject
          .replace(/{name}/g,    rec.name    || "")
          .replace(/{company}/g, rec.company || "");

        try {
          const res = await fetch(`${API}/api/email/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to:          rec.email,
              toName:      rec.name,
              subject:     personalisedSubject,
              htmlBody:    personalised,
              fromName,
              fromEmail,
              attachments: attachments.map(({ filename, content, contentType }) => ({ filename, content, contentType })),
            }),
          });
          const data = await res.json();
          if (data.ok) {
            sent++;
            addLog(`  ✓ Delivered via ${data.provider}${data.mocked ? " (mock)" : ""}`, "success");
          } else {
            failed++;
            addLog(`  ✗ Failed: ${data.error}`, "error");
          }
        } catch (err) {
          failed++;
          addLog(`  ✗ Network error: ${err.message}`, "error");
        }

        // Rate-limit delay between sends
        if (i < companies.length - 1) {
          addLog(`  ⏱ Waiting ${delayMs / 1000}s…`, "info");
          await delay(delayMs);
        }
      }

      const r = { sent, failed, total: companies.length, ts: new Date().toISOString(), subject };
      setResult(r);
      addLog(`─── Done: ${sent} sent, ${failed} failed ───`, sent === companies.length ? "success" : "warn");
      saveHistory([r, ...history].slice(0, 50));
      if (sent > 0) notify?.(`Sent ${sent}/${companies.length} sponsor emails`, "success");

    } catch (err) {
      addLog(`Fatal error: ${err.message}`, "error");
      notify?.("Blast failed: " + err.message, "error");
    }
    setSending(false);
  };

  // ── Derived ───────────────────────────────────────────
  const previewHtml = bodyHtml
    .replace(/{name}/g,    companies[0]?.name    || "Alex")
    .replace(/{company}/g, companies[0]?.company || "Acme Corp")
    .replace(/{email}/g,   companies[0]?.email   || "alex@acme.com");

  // ── UI ────────────────────────────────────────────────
  return (
    <div style={{ padding: mobile ? 16 : 28, maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ background: T.accent + "22", padding: 8, borderRadius: 10 }}>
            <Briefcase size={20} color={T.accentL} />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Sponsor Outreach</h2>
            <p style={{ fontSize: 13, color: T.muted }}>Send personalised sponsorship emails with your documentation attached</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0a0a14", padding: 4, borderRadius: 12, width: "fit-content" }}>
        {[
          { id: "compose", label: "Compose",  icon: <Mail   size={14}/> },
          { id: "settings",label: "SMTP",     icon: <Settings size={14}/> },
          { id: "history", label: "History",  icon: <Clock  size={14}/> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: tab === t.id ? T.accent : "transparent",
              color:      tab === t.id ? "white"   : T.muted,
              transition: "all .18s" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── COMPOSE TAB ── */}
      {tab === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 340px", gap: 20 }}>

          {/* Left: Compose */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Sender */}
            <Card style={{ padding: 20 }}>
              <p style={{ ...s.label, marginBottom: 12 }}>Sender Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Inp label="From Name"  value={fromName}  onChange={setFromName}  placeholder="Evenova" />
                <Inp label="From Email" value={fromEmail} onChange={setFromEmail} placeholder="hello.evenova@gmail.com" />
              </div>
            </Card>

            {/* AI */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Sparkles size={16} color={T.gold} />
                <span style={{ ...s.label, marginBottom: 0 }}>AI Email Generator</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Inp
                    value={aiPrompt}
                    onChange={setAiPrompt}
                    placeholder='e.g. "We want tech companies to sponsor our dev conferences"'
                  />
                </div>
                <Btn v="gold" onClick={generateAiTemplate} disabled={aiLoading}
                  icon={<Sparkles size={14}/>}>
                  {aiLoading ? "Writing…" : "Generate"}
                </Btn>
              </div>
            </Card>

            {/* Subject + Body */}
            <Card style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <Inp label="Subject Line" value={subject} onChange={setSubject}
                  placeholder="Partnership Opportunity — Evenova × {company}" />
                <p style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                  Use <code style={{color: T.accentL}}>{"{name}"}</code> and <code style={{color: T.accentL}}>{"{company}"}</code> as placeholders
                </p>
              </div>

              <div>
                <label style={s.label}>Email Body (HTML)</label>
                <textarea
                  value={bodyHtml}
                  onChange={e => setBodyHtml(e.target.value)}
                  rows={14}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13,
                    color: T.text, background: T.surface, border: `1px solid ${T.border}`,
                    fontFamily: "monospace", resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Btn v="secondary" sz="sm" onClick={() => setShowPreview(true)} icon={<Eye size={13}/>}>Preview</Btn>
                  <Btn v="secondary" sz="sm" onClick={() => setBodyHtml(DEFAULT_BODY)}>Reset Template</Btn>
                </div>
              </div>
            </Card>

            {/* Attachments */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Paperclip size={16} color={T.accentL} />
                  <span style={s.label}>Documentation & Attachments</span>
                </div>
                <Bdg color="purple">{attachments.length}/3</Bdg>
              </div>

              {attachments.length === 0 && (
                <p style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>
                  Upload your sponsorship PDF, media kit, or deck — it will be attached to every email.
                </p>
              )}

              {attachments.map(a => (
                <div key={a.filename} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileText size={14} color={T.accentL} />
                    <span style={{ fontSize: 13, color: T.text }}>{a.filename}</span>
                    <span style={{ fontSize: 11, color: T.muted }}>({a.sizeKb} KB)</span>
                  </div>
                  <button onClick={() => removeAttachment(a.filename)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.danger, padding: 4 }}>
                    <X size={14} />
                  </button>
                </div>
              ))}

              <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.pptx,.png,.jpg"
                style={{ display: "none" }} onChange={handleAttachFile} />
              <Btn v="secondary" sz="sm" onClick={() => fileRef.current?.click()}
                disabled={attUploading || attachments.length >= 3}
                icon={<Upload size={13}/>}>
                {attUploading ? "Reading…" : "Attach File"}
              </Btn>
            </Card>

            {/* Send Settings */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Zap size={16} color={T.gold} />
                <span style={s.label}>Send Settings</span>
              </div>
              <Inp
                label="Delay between emails (ms)"
                type="number"
                value={String(delayMs)}
                onChange={v => setDelayMs(Math.max(2000, parseInt(v) || 5000))}
                hint={delayMs < 3000 ? "⚠ Below 3 s — Gmail may throttle" : ""}
              />
              <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                Gmail allows ~500 emails/day. Keep delay ≥ 5 s to avoid spam flags.
              </p>
            </Card>

            {/* Send Button */}
            <Btn v="primary" sz="lg" full onClick={sendBlast} disabled={sending}
              icon={<Send size={16}/>}>
              {sending ? `Sending… (${companies.length} companies)` : `Send to ${companies.length} Companies`}
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
                    background: result.failed === 0 ? T.success + "18" : T.warn + "18",
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

          {/* Right: Companies */}
          <div>
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ ...s.label, marginBottom: 0 }}>Companies ({companies.length})</p>
                <button onClick={() => setShowBulk(b => !b)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.accentL, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  {showBulk ? <ChevronUp size={13}/> : <ChevronDown size={13}/>} Bulk add
                </button>
              </div>

              {showBulk && (
                <div style={{ marginBottom: 16 }}>
                  <textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    rows={5}
                    placeholder={"One per line:\nemail\nname,email\nname,email,company"}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 12,
                      color: T.text, background: T.surface, border: `1px solid ${T.border}`,
                      fontFamily: "monospace", resize: "vertical" }}
                  />
                  <Btn v="secondary" sz="sm" onClick={parseBulk} style={{ marginTop: 6 }}>Parse & Add</Btn>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                <Inp placeholder="Contact name" value={addName}    onChange={setAddName}    />
                <Inp placeholder="Email *"      value={addEmail}   onChange={setAddEmail}   type="email" />
                <Inp placeholder="Company name" value={addCompany} onChange={setAddCompany} />
                <Btn v="secondary" sz="sm" full onClick={addCompanyRow} icon={<Plus size={13}/>}>Add Company</Btn>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 380, overflowY: "auto" }}>
                {companies.length === 0 && (
                  <p style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: "20px 0" }}>
                    No companies yet — add some above
                  </p>
                )}
                {companies.map(c => (
                  <div key={c.id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 10px", borderRadius: 8, background: T.surface,
                      border: `1px solid ${T.border}` }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.company}</p>
                      <p style={{ fontSize: 11, color: T.muted }}>{c.name} · {c.email}</p>
                    </div>
                    <button onClick={() => setCompanies(prev => prev.filter(x => x.id !== c.id))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.danger, padding: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {companies.length > 0 && (
                <button onClick={() => setCompanies([])}
                  style={{ marginTop: 10, fontSize: 11, color: T.danger, background: "none", border: "none",
                    cursor: "pointer", textDecoration: "underline" }}>
                  Clear all
                </button>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── SMTP SETTINGS TAB ── */}
      {tab === "settings" && (
        <Card style={{ padding: 28, maxWidth: 560 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 20 }}>Gmail SMTP Setup</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: T.accent + "14", border: `1px solid ${T.accent}44` }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.accentL, marginBottom: 4 }}>
                📋 Steps to enable Gmail SMTP
              </p>
              <ol style={{ fontSize: 12, color: T.muted, paddingLeft: 18, lineHeight: 2 }}>
                <li>Go to <strong style={{color: T.text}}>myaccount.google.com</strong></li>
                <li>Security → 2-Step Verification → enable it</li>
                <li>Search for <strong style={{color: T.text}}>"App passwords"</strong></li>
                <li>Create one for "Mail" — copy the 16-char password</li>
                <li>Add to your <code style={{color: T.accentL}}>backend/.env</code> (see below)</li>
              </ol>
            </div>

            <div style={{ padding: "14px 16px", borderRadius: 10, background: "#0a0a14", border: `1px solid ${T.border}` }}>
              <p style={{ ...s.label, marginBottom: 8 }}>backend/.env</p>
              <pre style={{ fontSize: 12, color: "#a5f3c0", fontFamily: "monospace", lineHeight: 1.8, margin: 0 }}>{`EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx

EMAIL_FROM_NAME=Evenova
EMAIL_FROM_ADDRESS=youremail@gmail.com`}</pre>
            </div>

            <div style={{ padding: "14px 16px", borderRadius: 10, background: "#0a0a14", border: `1px solid ${T.border}` }}>
              <p style={{ ...s.label, marginBottom: 8 }}>Running without a domain (localhost)</p>
              <pre style={{ fontSize: 12, color: "#a5f3c0", fontFamily: "monospace", lineHeight: 1.8, margin: 0 }}>{`# Terminal 1 — start backend
cd backend && npm run dev

# Terminal 2 — start frontend
cd frontend && npm run dev

# Optional: share backend publicly (free)
npx localtunnel --port 4000
# or
npx cloudflared tunnel --url http://localhost:4000`}</pre>
            </div>

            <div style={{ padding: "14px 16px", borderRadius: 10, background: T.gold + "12", border: `1px solid ${T.gold}44` }}>
              <p style={{ fontSize: 12, color: T.gold }}>
                ⚠ Gmail allows ~500 emails/day on a free account.
                Keep the delay at 5–8 seconds between sends.
                For higher volume, upgrade to Google Workspace or switch to Brevo (free tier: 300/day).
              </p>
            </div>

            <Btn v="secondary" onClick={testSmtp} disabled={smtpTesting} icon={<Zap size={14}/>}>
              {smtpTesting ? "Testing…" : "Test SMTP Connection"}
            </Btn>

            {smtpStatus && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                borderRadius: 8, background: smtpStatus.ok ? T.success + "18" : T.danger + "18",
                border: `1px solid ${smtpStatus.ok ? T.success : T.danger}44` }}>
                {smtpStatus.ok
                  ? <CheckCircle size={15} color={T.success} />
                  : <AlertCircle size={15} color={T.danger} />}
                <span style={{ fontSize: 13, color: T.text }}>
                  {smtpStatus.ok ? smtpStatus.message : smtpStatus.error}
                </span>
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
                    <p style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{h.subject}</p>
                    <p style={{ fontSize: 12, color: T.muted }}>{new Date(h.ts).toLocaleString()}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Bdg color="purple">{h.sent} sent</Bdg>
                    {h.failed > 0 && <Bdg color="red">{h.failed} failed</Bdg>}
                  </div>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <Modal onClose={() => setShowPreview(false)} title="Email Preview">
          <p style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
            Subject: <strong style={{color: T.text}}>{subject.replace(/{company}/g, companies[0]?.company || "Acme Corp")}</strong>
          </p>
          <div style={{ background: "white", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
            <iframe
              srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
                body{font-family:Georgia,serif;color:#222;max-width:600px;margin:24px auto;padding:20px;line-height:1.7;}
                h3{color:#7c3aed;} ul{margin:12px 0;padding-left:20px;} li{margin:4px 0;}
              </style></head><body>${previewHtml}</body></html>`}
              style={{ width: "100%", height: 480, border: "none" }}
              title="Email preview"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}