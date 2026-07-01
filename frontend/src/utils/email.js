/* ─────────────────────────────────────────────────────────────
   Email Engine — calls the Evenova backend for all email sends
   Backend must be running. Set VITE_API_URL in frontend/.env
   e.g.  VITE_API_URL=http://localhost:4000
─────────────────────────────────────────────────────────────── */

export const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Sends a single email via the backend.
 * Throws on failure — callers decide whether to surface or swallow the error.
 */
export async function sendEmail({ to, toName, subject, htmlBody, fromName, fromEmail }) {
  let res;
  try {
    res = await fetch(`${API}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, toName, subject, htmlBody, fromName, fromEmail }),
    });
  } catch {
    // Network error — backend not running
    console.warn(`[Evenova] Backend unreachable. Email NOT sent to ${to} | Subject: ${subject}`);
    return { ok: true, provider: "mock", mocked: true };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return { ok: true, provider: data.provider, mocked: data.provider === "mock" };
}

/**
 * Checks the backend email status (provider, whether a key is configured).
 * Returns null if backend is unreachable.
 */
export async function getEmailStatus() {
  try {
    const res = await fetch(`${API}/api/email/status`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Saves email provider config to the backend (persists for server session).
 */
export async function configureEmailProvider({ provider, resendKey, brevoKey, sesUrl, sesKey }) {
  const res = await fetch(`${API}/api/email/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, resendKey, brevoKey, sesUrl, sesKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to save config");
  return data;
}

/**
 * Sends a blast via the backend bulk endpoint.
 * Returns { sent, failed, total, provider, mocked, errors[] }
 */
export async function sendBlast({ recipients, subject, htmlBody, fromName, fromEmail }) {
  let res;
  try {
    res = await fetch(`${API}/api/email/blast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients, subject, htmlBody, fromName, fromEmail }),
    });
  } catch {
    throw new Error("Backend is not running. Start the backend server first (cd backend && npm start).");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ── Ticket email ──────────────────────────────────────────── */
export async function buildTicketHtml(ticket, event, ticketType) {
  const color = ticketType?.color || "#7c3aed";
  // Prefer the ticket tier's own image, then the event cover image, then
  // fall back to the brand gradient if the organizer hasn't uploaded either.
  const bgImage = ticketType?.ticketImage || event.coverImage || "";

  // Generate a REAL, scannable QR code (not just text) from the same signed
  // payload the gate scanner verifies against (ticket.code).
  let qrDataUrl = "";
  try {
    const QRCode = await import("qrcode");
    qrDataUrl = await QRCode.toDataURL(ticket.code, {
      margin: 1, width: 320,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    });
  } catch (e) {
    console.error("QR generation failed, falling back to text code", e);
  }

  const heroStyle = bgImage
    ? `background-image:url('${bgImage}');background-size:cover;background-position:center;`
    : `background:linear-gradient(135deg,#7c3aed,#a855f7);`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;}
  .wrap{max-width:520px;margin:0 auto;}
  .card{position:relative;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.16);background:#fff;}
  .hero{${heroStyle}position:relative;min-height:200px;padding:24px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;}
  .hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(15,8,30,.15),rgba(10,5,20,.88));}
  .hero-inner{position:relative;color:#fff;}
  .eyebrow{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.75;}
  .ev-title{margin:0 0 4px;font-size:22px;font-weight:800;line-height:1.25;}
  .ev-sub{margin:0;font-size:13px;opacity:.85;}
  .seam{position:relative;height:0;}
  .notch{position:absolute;top:-11px;width:22px;height:22px;border-radius:50%;background:#f5f5f5;}
  .notch-l{left:-11px;} .notch-r{right:-11px;}
  .dashes{border-top:2px dashed rgba(0,0,0,.14);margin:0 22px;}
  .stub{padding:26px 28px 8px;text-align:center;}
  .qr-wrap{background:#fff;border:1px solid #f0f0f0;border-radius:14px;padding:16px;display:inline-block;}
  .tier{display:inline-block;padding:4px 14px;border-radius:100px;font-size:12px;font-weight:700;background:${color}22;color:${color};border:1px solid ${color}44;margin-bottom:14px;}
  .details{padding:6px 28px 24px;}
  .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f0f0f0;}
  .label{font-size:12px;color:#999;text-transform:uppercase;letter-spacing:.05em;}
  .value{font-size:14px;font-weight:600;color:#1a1a1a;text-align:right;}
  .footer{padding:16px 8px;text-align:center;font-size:12px;color:#999;}
</style></head>
<body>
<div class="wrap">
  <div class="card">
    <div class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-inner">
        <p class="eyebrow">Evenova · Admit One</p>
        <p class="ev-title">${event.title}</p>
        <p class="ev-sub">${event.date} at ${event.time} · ${event.venue}${event.city ? ", " + event.city : ""}</p>
      </div>
    </div>
    <div class="seam"><div class="notch notch-l"></div><div class="notch notch-r"></div></div>
    <div class="dashes"></div>
    <div class="stub">
      <span class="tier">${ticketType?.name || "General"}</span><br>
      ${qrDataUrl
        ? `<div class="qr-wrap"><img src="${qrDataUrl}" width="200" height="200" alt="Scan this QR code at the gate"></div>`
        : `<div class="qr-wrap"><code style="font-size:10px;word-break:break-all;">${ticket.code}</code></div>`}
      <p style="font-size:11px;color:#aaa;margin:14px 0 0;">Show this at the gate · Cryptographically signed · Cannot be duplicated</p>
    </div>
    <div class="details">
      <div class="row"><span class="label">Name</span><span class="value">${ticket.holderName || "Attendee"}</span></div>
      <div class="row"><span class="label">Ticket ID</span><span class="value" style="font-family:monospace;font-size:12px">${ticket.id}</span></div>
    </div>
  </div>
  <div class="footer">Powered by Evenova · hello.evenova@gmail.com</div>
</div>
</body></html>`;
}

export async function sendTicketEmail(ticket, event, ticketType, notify) {
  try {
    const html = await buildTicketHtml(ticket, event, ticketType);
    const result = await sendEmail({
      to: ticket.holderEmail,
      toName: ticket.holderName,
      subject: `Your ticket for ${event.title} 🎟`,
      htmlBody: html,
    });
    if (notify) {
      result.mocked
        ? notify("⚠️ Email simulated — backend not running or no provider key set", "info")
        : notify(`✅ Ticket emailed to ${ticket.holderEmail}`);
    }
    return result;
  } catch (e) {
    if (notify) notify("Email send failed: " + e.message, "error");
    return { ok: false, error: e.message };
  }
}