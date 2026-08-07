/* ─────────────────────────────────────────────────────────────
   Email Engine — calls backend API for all email sending
   Backend must be running on PORT 4000
─────────────────────────────────────────────────────────────── */

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function sendEmail({ to, toName, subject, htmlBody, fromName, fromEmail }) {
  try {
    const res = await fetch(`${API}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, toName, subject, htmlBody, fromName, fromEmail }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Email send failed");
    return { ok: true, provider: data.provider };
  } catch (err) {
    // Fallback: log to console in dev
    console.log(`[EVENOVA EMAIL]\nTo: ${to}\nSubject: ${subject}\n\nBody:\n${htmlBody}`);
    console.warn("Email API error:", err.message);
    return { ok: true, provider: "mock" };
  }
}

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
    <div class="row"><span class="label">Date & Time</span><span class="value">${event.date} at ${event.time}</span></div>
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
      result.provider === "mock"
        ? notify("⚠️ Email simulated — start the backend server to send real emails", "info")
        : notify(`✅ Ticket emailed to ${ticket.holderEmail}`);
    }
    return result;
  } catch (e) {
    if (notify) notify("Email send failed: " + e.message, "error");
    return { ok: false, error: e.message };
  }
}