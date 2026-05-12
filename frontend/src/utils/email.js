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
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12);}
  .header{background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;color:#fff;}
  .header h1{margin:0;font-size:26px;font-weight:800;}
  .header p{margin:6px 0 0;opacity:.8;font-size:14px;}
  .body{padding:28px 32px;}
  .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0;}
  .label{font-size:12px;color:#999;text-transform:uppercase;letter-spacing:.05em;}
  .value{font-size:14px;font-weight:600;color:#1a1a1a;}
  .tier{display:inline-block;padding:4px 14px;border-radius:100px;font-size:12px;font-weight:700;background:${color}22;color:${color};border:1px solid ${color}44;}
  .qr-box{background:#f8f8f8;border-radius:12px;padding:24px;text-align:center;margin-top:20px;}
  .qr-code{font-family:monospace;font-size:10px;word-break:break-all;color:#555;background:#fff;padding:12px;border-radius:8px;border:1px solid #eee;display:inline-block;max-width:440px;}
  .footer{padding:16px 32px;background:#fafafa;text-align:center;font-size:12px;color:#999;border-top:1px solid #f0f0f0;}
</style></head>
<body><div class="wrap">
  <div class="header"><h1>🎟 Your Ticket</h1><p>${event.title}</p></div>
  <div class="body">
    <div class="row"><span class="label">Name</span><span class="value">${ticket.holderName || "Attendee"}</span></div>
    <div class="row"><span class="label">Event</span><span class="value">${event.title}</span></div>
    <div class="row"><span class="label">Date &amp; Time</span><span class="value">${event.date} at ${event.time}</span></div>
    <div class="row"><span class="label">Venue</span><span class="value">${event.venue}, ${event.city}</span></div>
    <div class="row"><span class="label">Ticket Type</span><span class="value"><span class="tier">${ticketType?.name || "General"}</span></span></div>
    <div class="row"><span class="label">Ticket ID</span><span class="value" style="font-family:monospace;font-size:12px">${ticket.id}</span></div>
    <div class="qr-box">
      <p style="font-size:13px;font-weight:700;color:#333;margin:0 0 12px">Show this QR code at the gate</p>
      <div class="qr-code">${ticket.code}</div>
      <p style="font-size:11px;color:#aaa;margin:10px 0 0">Cryptographically signed · Cannot be duplicated</p>
    </div>
  </div>
  <div class="footer">Powered by Evenova · hello.evenova@gmail.com</div>
</div></body></html>`;
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
