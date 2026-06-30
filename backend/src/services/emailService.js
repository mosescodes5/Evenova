/**
 * emailService.js — Dual-provider email: Brevo (bulk) + SMTP (fallback)
 *
 * Strategy:
 *   send()         → Brevo first → SMTP fallback (single transactional emails)
 *   blast()        → Brevo only  (bulk marketing, personalized, tracked)
 *   sponsorBlast() → Brevo with attachments → SMTP fallback per-recipient
 *
 * Required env vars:
 *   EMAIL_PROVIDER=brevo+smtp   ← new dual-mode value
 *   BREVO_API_KEY=xkeysib-...
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=hello.evenova@gmail.com
 *   SMTP_PASS=<gmail-app-password>
 *   EMAIL_FROM_NAME=Evenova
 *   EMAIL_FROM_ADDRESS=hello.evenova@gmail.com
 */

import { config } from "../config.js";

// ─── Runtime override (POST /api/email/config) ───────────────────────────────
let _runtime = {};

export function configureEmail(cfg) {
  _runtime = { ...cfg };
  console.log(`[emailService] Runtime config updated: provider=${cfg.provider}`);
}

export function getEmailStatus() {
  const provider  = _runtime.provider  || config.email.provider;
  const brevoKey  = _runtime.brevoKey  || config.email.brevoKey;
  const smtpReady = !!(config.email.smtp.host && config.email.smtp.user && config.email.smtp.pass);
  const brevoReady = !!brevoKey;

  return {
    provider,
    brevoReady,
    smtpReady,
    mocked: !brevoReady && !smtpReady,
  };
}

// ─── SMTP transporter (nodemailer) ───────────────────────────────────────────
let _smtpTransporter = null;

async function getSmtpTransporter() {
  if (_smtpTransporter) return _smtpTransporter;

  const nm     = await import("nodemailer");
  const mailer = nm.default ?? nm;
  const { host, port, user, pass } = config.email.smtp;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in your .env"
    );
  }

  _smtpTransporter = mailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    pool: true,          // reuse connections
    maxConnections: 3,   // don't spam Gmail
  });

  return _smtpTransporter;
}

export async function testSmtpConnection() {
  try {
    const t = await getSmtpTransporter();
    await t.verify();
    return { ok: true, message: "SMTP connection verified ✓" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── Brevo single send ────────────────────────────────────────────────────────
async function sendViaBrevo({ to, toName, subject, htmlBody, fromName, fromEmail, attachments = [] }) {
  const brevoKey = _runtime.brevoKey || config.email.brevoKey;
  if (!brevoKey) throw new Error("BREVO_API_KEY not configured");

  const body = {
    sender:      { name: fromName, email: fromEmail },
    to:          [{ email: to, name: toName || "" }],
    subject,
    htmlContent: htmlBody,
  };

  if (attachments.length) {
    body.attachment = attachments.map((a) => ({
      name:    a.filename,
      content: a.content, // base64
    }));
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method:  "POST",
    headers: { "Content-Type": "application/json", "api-key": brevoKey },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo: ${err?.message || res.status}`);
  }

  return { provider: "brevo" };
}

// ─── SMTP single send ─────────────────────────────────────────────────────────
async function sendViaSmtp({ to, toName, subject, htmlBody, fromName, fromEmail, attachments = [] }) {
  const transporter = await getSmtpTransporter();

  const mailOpts = {
    from:    `"${fromName}" <${fromEmail}>`,
    to:      toName ? `"${toName}" <${to}>` : to,
    subject,
    html:    htmlBody,
  };

  if (attachments.length) {
    mailOpts.attachments = attachments.map((a) => ({
      filename:    a.filename,
      content:     Buffer.from(a.content, "base64"),
      contentType: a.contentType || "application/octet-stream",
    }));
  }

  await transporter.sendMail(mailOpts);
  return { provider: "smtp" };
}

// ─── Main send — Brevo first, SMTP fallback ───────────────────────────────────
/**
 * Send a single email.
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} [opts.toName]
 * @param {string} opts.subject
 * @param {string} opts.htmlBody
 * @param {string} [opts.fromName]
 * @param {string} [opts.fromEmail]
 * @param {Array}  [opts.attachments]  [{ filename, content (base64), contentType }]
 */
async function send({ to, toName, subject, htmlBody, fromName, fromEmail, attachments = [] }) {
  fromName  = fromName  || config.email.fromName;
  fromEmail = fromEmail || config.email.fromAddress;

  const provider  = _runtime.provider || config.email.provider;
  const brevoKey  = _runtime.brevoKey || config.email.brevoKey;
  const smtpReady = !!(config.email.smtp.host && config.email.smtp.user && config.email.smtp.pass);

  const opts = { to, toName, subject, htmlBody, fromName, fromEmail, attachments };

  // ── Dual mode: Brevo → SMTP fallback ─────────────────────────────────────
  if (provider === "brevo+smtp" || (!provider && brevoKey)) {
    if (brevoKey) {
      try {
        return await sendViaBrevo(opts);
      } catch (err) {
        console.warn(`[emailService] Brevo failed (${err.message}), falling back to SMTP…`);
        if (smtpReady) return await sendViaSmtp(opts);
        throw err; // no fallback available
      }
    }
    if (smtpReady) return await sendViaSmtp(opts);
  }

  // ── Brevo-only ────────────────────────────────────────────────────────────
  if (provider === "brevo" && brevoKey) {
    return await sendViaBrevo(opts);
  }

  // ── SMTP-only ─────────────────────────────────────────────────────────────
  if (provider === "smtp" && smtpReady) {
    return await sendViaSmtp(opts);
  }

  // ── Resend (kept for backward compat) ─────────────────────────────────────
  const resendKey = _runtime.resendKey || config.email.resendKey;
  if (provider === "resend" && resendKey) {
    const body = {
      from: `${fromName} <${fromEmail}>`,
      to:   [to],
      subject,
      html: htmlBody,
    };
    if (attachments.length) {
      body.attachments = attachments.map((a) => ({ filename: a.filename, content: a.content }));
    }
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body:    JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Resend: ${e.message || res.status}`);
    }
    return { provider: "resend" };
  }

  // ── Mock fallback ─────────────────────────────────────────────────────────
  console.log(`[EVENOVA MOCK EMAIL] To: ${to} | Subject: ${subject}`);
  return { provider: "mock" };
}

// ─── Bulk blast via Brevo (most efficient for many recipients) ────────────────
/**
 * Send to many recipients using Brevo.
 * Each email is personalised with {name}, {email}, {company} placeholders.
 * Falls back to SMTP per-recipient if Brevo is unavailable.
 *
 * @param {Array}  recipients  [{ email, name, company }]
 * @param {string} subject
 * @param {string} htmlBody    — supports {name}, {email}, {company}
 * @param {string} [fromName]
 * @param {string} [fromEmail]
 * @param {Array}  [attachments]
 * @param {number} [delayMs]   — ms between sends (default 300ms for Brevo, 5000ms for SMTP)
 */
async function blast({
  recipients,
  subject,
  htmlBody,
  fromName,
  fromEmail,
  attachments = [],
  delayMs,
}) {
  fromName  = fromName  || config.email.fromName;
  fromEmail = fromEmail || config.email.fromAddress;

  const brevoKey  = _runtime.brevoKey || config.email.brevoKey;
  const smtpReady = !!(config.email.smtp.host && config.email.smtp.user && config.email.smtp.pass);
  const useBrevo  = !!brevoKey;

  // Default delay: Brevo allows ~10 req/s, SMTP Gmail allows ~1/s
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const defaultDelay = useBrevo ? 200 : 5000;
  const waitMs = delayMs ?? defaultDelay;

  const results = {
    sent: 0,
    failed: 0,
    total: recipients.length,
    provider: useBrevo ? "brevo" : smtpReady ? "smtp" : "mock",
    errors: [],
  };

  for (let i = 0; i < recipients.length; i++) {
    const rec = recipients[i];

    const personalised = htmlBody
      .replace(/{name}/g,    rec.name    || "")
      .replace(/{email}/g,   rec.email   || "")
      .replace(/{company}/g, rec.company || "");

    const personalisedSubject = subject
      .replace(/{name}/g,    rec.name    || "")
      .replace(/{company}/g, rec.company || "");

    try {
      const opts = {
        to:          rec.email,
        toName:      rec.name,
        subject:     personalisedSubject,
        htmlBody:    personalised,
        fromName,
        fromEmail,
        attachments,
      };

      if (useBrevo) {
        try {
          await sendViaBrevo(opts);
        } catch (brevoErr) {
          console.warn(`[blast] Brevo failed for ${rec.email}, trying SMTP…`);
          if (smtpReady) {
            await sendViaSmtp(opts);
            results.provider = "smtp"; // at least one went via SMTP
          } else {
            throw brevoErr;
          }
        }
      } else if (smtpReady) {
        await sendViaSmtp(opts);
      } else {
        console.log(`[MOCK BLAST] To: ${rec.email} | Subject: ${personalisedSubject}`);
      }

      results.sent++;
      console.log(`[blast] ✓ [${i + 1}/${recipients.length}] ${rec.name || rec.email}`);
    } catch (err) {
      results.failed++;
      if (results.errors.length < 10) {
        results.errors.push({ email: rec.email, error: err.message });
      }
      console.error(`[blast] ✗ ${rec.email}:`, err.message);
    }

    if (i < recipients.length - 1) await delay(waitMs);
  }

  console.log(`[blast] Done — ${results.sent} sent, ${results.failed} failed`);
  return results;
}

// ─── Ticket email (unchanged) ─────────────────────────────────────────────────
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

// ─── Verification email (account email confirmation) ──────────────────────────
function buildVerificationHtml(name, link) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12);">
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:22px;font-weight:800;">Confirm your email</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${name || "there"},</p>
      <p style="font-size:14px;color:#333;line-height:1.6;">
        Thanks for signing up for Evenova. Click the button below to confirm your email address and continue setting up your account.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${link}" style="display:inline-block;padding:14px 32px;border-radius:10px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">
          Verify Email Address
        </a>
      </div>
      <p style="font-size:12px;color:#999;line-height:1.6;">
        This link expires in 24 hours. If the button doesn't work, copy and paste this URL into your browser:<br>
        <span style="word-break:break-all;color:#7c3aed;">${link}</span>
      </p>
      <p style="font-size:12px;color:#999;">If you didn't create an account with Evenova, you can safely ignore this email.</p>
    </div>
    <div style="padding:16px 32px;background:#fafafa;text-align:center;font-size:12px;color:#999;border-top:1px solid #f0f0f0;">
      Evenova · hello.evenova@gmail.com
    </div>
  </div>
</body></html>`;
}

async function sendVerificationEmail(toEmail, toName, token) {
  const link = `${config.frontendUrl}/?view=verify-email&token=${encodeURIComponent(token)}`;
  return send({
    to: toEmail,
    toName,
    subject: "Confirm your email — Evenova",
    htmlBody: buildVerificationHtml(toName, link),
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export const emailService = {
  send,
  blast,
  sendTicketEmail,
  sendVerificationEmail,
  buildTicketHtml,
  configure:   configureEmail,
  getStatus:   getEmailStatus,
  testSmtp:    testSmtpConnection,
};