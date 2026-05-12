import { config } from "../config.js";

/**
 * Runtime config override — set via POST /api/email/config
 * Persists for the life of the server process (survives across requests).
 */
let _runtime = {};

export function configureEmail(cfg) {
  _runtime = { ...cfg };
  console.log(`[emailService] Runtime config updated: provider=${cfg.provider}`);
}

export function getEmailStatus() {
  const provider = _runtime.provider || config.email.provider;
  const hasKey = !!(
    (_runtime.resendKey || config.email.resendKey) ||
    (_runtime.brevoKey  || config.email.brevoKey)  ||
    (_runtime.sesUrl    || config.email.sesUrl)     ||
    (config.email.smtp.host)
  );
  return { provider, hasKey, mocked: provider === "mock" || !hasKey };
}

/**
 * Build a nodemailer transporter using Gmail SMTP (App Password).
 * SMTP_HOST=smtp.gmail.com | SMTP_PORT=587 | SMTP_USER=you@gmail.com | SMTP_PASS=<app-password>
 */
async function getSmtpTransporter() {
  const nm = await import("nodemailer");
  const mailer = nm.default ?? nm;

  const host = config.email.smtp.host;
  const port = config.email.smtp.port;
  const user = config.email.smtp.user;
  const pass = config.email.smtp.pass;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env"
    );
  }

  return mailer.createTransport({
    host,
    port,
    secure: port === 465,   // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
    tls: { rejectUnauthorized: false }, // works even without a domain
  });
}

/**
 * Verify the SMTP connection — call from /api/email/test-smtp
 */
export async function testSmtpConnection() {
  try {
    const transporter = await getSmtpTransporter();
    await transporter.verify();
    return { ok: true, message: "SMTP connection verified ✓" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Sends a single email.
 * @param {object} opts
 * @param {string}   opts.to
 * @param {string}   [opts.toName]
 * @param {string}   opts.subject
 * @param {string}   opts.htmlBody
 * @param {string}   [opts.fromName]
 * @param {string}   [opts.fromEmail]
 * @param {Array}    [opts.attachments]  — [{ filename, content (base64 string), contentType }]
 */
async function send({ to, toName, subject, htmlBody, fromName, fromEmail, attachments = [] }) {
  fromName  = fromName  || config.email.fromName;
  fromEmail = fromEmail || config.email.fromAddress;

  const provider  = _runtime.provider  || config.email.provider;
  const resendKey = _runtime.resendKey || config.email.resendKey;
  const brevoKey  = _runtime.brevoKey  || config.email.brevoKey;
  const sesUrl    = _runtime.sesUrl    || config.email.sesUrl;
  const sesKey    = _runtime.sesKey    || config.email.sesKey;

  // ── Resend ────────────────────────────────────────────────
  if (provider === "resend" && resendKey) {
    const body = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html: htmlBody,
    };
    // Resend supports attachments natively
    if (attachments.length) {
      body.attachments = attachments.map(a => ({
        filename: a.filename,
        content:  a.content, // base64 string
      }));
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Resend: ${e.message || res.status}`);
    }
    return { provider: "resend" };
  }

  // ── Brevo ─────────────────────────────────────────────────
  if (provider === "brevo" && brevoKey) {
    const body = {
      sender:      { name: fromName, email: fromEmail },
      to:          [{ email: to, name: toName }],
      subject,
      htmlContent: htmlBody,
    };
    if (attachments.length) {
      body.attachment = attachments.map(a => ({
        name:    a.filename,
        content: a.content, // base64
      }));
    }
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": brevoKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Brevo: ${res.status}`);
    return { provider: "brevo" };
  }

  // ── SES (custom endpoint) ─────────────────────────────────
  if ((provider === "ses" || sesUrl) && sesUrl) {
    const res = await fetch(sesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sesKey ? { "x-api-key": sesKey } : {}),
      },
      body: JSON.stringify({ to, toName, subject, htmlBody, fromName, fromEmail, attachments }),
    });
    if (!res.ok) throw new Error(`SES endpoint: ${res.status}`);
    return { provider: "ses" };
  }

  // ── Gmail SMTP (nodemailer) ────────────────────────────────
  // Works with EMAIL_PROVIDER=smtp and SMTP_HOST=smtp.gmail.com
  if (provider === "smtp" && config.email.smtp.host) {
    const transporter = await getSmtpTransporter();

    const mailOpts = {
      from:    `"${fromName}" <${fromEmail}>`,
      to:      toName ? `"${toName}" <${to}>` : to,
      subject,
      html:    htmlBody,
    };

    // Add file attachments when present
    if (attachments.length) {
      mailOpts.attachments = attachments.map(a => ({
        filename:    a.filename,
        content:     Buffer.from(a.content, "base64"),
        contentType: a.contentType || "application/octet-stream",
      }));
    }

    await transporter.sendMail(mailOpts);
    return { provider: "smtp" };
  }

  // ── Mock fallback ──────────────────────────────────────────
  console.log(`[EVENOVA MOCK EMAIL] To: ${to} | Subject: ${subject} | Attachments: ${attachments.length}`);
  return { provider: "mock" };
}

// ────────────────────────────────────────────────────────────
// Ticket email (unchanged)
// ────────────────────────────────────────────────────────────
function buildTicketHtml(ticket, event, ticketType) {
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

async function sendTicketEmail(ticket, recipientEmail, event, ticketType) {
  const html = buildTicketHtml(ticket, event, ticketType);
  return send({
    to:      recipientEmail,
    toName:  ticket.holderName,
    subject: `Your ticket for ${event.title} 🎟`,
    htmlBody: html,
  });
}

export const emailService = {
  send,
  sendTicketEmail,
  buildTicketHtml,
  configure:   configureEmail,
  getStatus:   getEmailStatus,
  testSmtp:    testSmtpConnection,
};