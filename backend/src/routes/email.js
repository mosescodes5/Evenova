import express from "express";
import { emailService } from "../services/emailService.js";

const router = express.Router();

/** GET /api/email/status — check provider and whether it has a real key */
router.get("/status", (req, res) => {
  res.json({ ok: true, ...emailService.getStatus() });
});

/** POST /api/email/config — update provider + keys for this server session */
router.post("/config", (req, res) => {
  const { provider, resendKey, brevoKey, sesUrl, sesKey } = req.body;
  emailService.configure({ provider, resendKey, brevoKey, sesUrl, sesKey });
  res.json({ ok: true, ...emailService.getStatus() });
});

/** POST /api/email/test-smtp — verify SMTP credentials work */
router.post("/test-smtp", async (req, res) => {
  const result = await emailService.testSmtp();
  res.json(result);
});

/** POST /api/email/send — single email (optionally with attachments) */
router.post("/send", async (req, res) => {
  try {
    const { to, toName, subject, htmlBody, fromName, fromEmail, attachments } = req.body;
    if (!to || !subject || !htmlBody) {
      return res.status(400).json({ ok: false, error: "to, subject and htmlBody are required" });
    }
    const result = await emailService.send({
      to, toName, subject, htmlBody, fromName, fromEmail,
      attachments: attachments || [],
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[email/send]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** POST /api/email/blast — send to multiple recipients, personalised */
router.post("/blast", async (req, res) => {
  try {
    const { recipients, subject, htmlBody, fromName, fromEmail } = req.body;
    if (!recipients?.length || !subject || !htmlBody) {
      return res.status(400).json({ ok: false, error: "recipients, subject and htmlBody are required" });
    }
    const status = emailService.getStatus();
    let sent = 0, failed = 0, errors = [];

    for (const rec of recipients) {
      const personalised = htmlBody
        .replace(/{name}/g,    rec.name    || "")
        .replace(/{email}/g,   rec.email   || "")
        .replace(/{company}/g, rec.company || "");
      try {
        await emailService.send({
          to: rec.email, toName: rec.name, subject,
          htmlBody: personalised, fromName, fromEmail,
        });
        sent++;
      } catch (e) {
        failed++;
        if (errors.length < 5) errors.push({ email: rec.email, error: e.message });
      }
    }
    res.json({ ok: true, sent, failed, total: recipients.length, provider: status.provider, mocked: status.mocked, errors });
  } catch (err) {
    console.error("[email/blast]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/email/sponsor-blast
 *
 * Purpose: Send personalised sponsorship outreach emails with documentation attached.
 *
 * Body:
 * {
 *   recipients: [{ email, name, company }],
 *   subject:    string,
 *   htmlBody:   string  (supports {name}, {company} placeholders),
 *   fromName:   string,
 *   fromEmail:  string,
 *   attachments: [{ filename, content (base64), contentType }],  // e.g. your sponsorship PDF
 *   delayMs:    number  // ms between sends (default 5000 — respect Gmail limits)
 * }
 *
 * Returns streaming-friendly progress via SSE (see below), or a simple JSON result.
 */
router.post("/sponsor-blast", async (req, res) => {
  try {
    const {
      recipients,
      subject,
      htmlBody,
      fromName,
      fromEmail,
      attachments = [],
      delayMs = 5000,
    } = req.body;

    if (!recipients?.length || !subject || !htmlBody) {
      return res.status(400).json({
        ok: false,
        error: "recipients, subject and htmlBody are required",
      });
    }

    if (attachments.length > 3) {
      return res.status(400).json({ ok: false, error: "Maximum 3 attachments per email" });
    }

    // Validate total attachment size (base64 ~= actual × 1.37) — cap at ~8 MB decoded
    const totalB64Len = attachments.reduce((s, a) => s + (a.content?.length || 0), 0);
    if (totalB64Len > 11_000_000) {
      return res.status(400).json({ ok: false, error: "Total attachment size too large (max ~8 MB)" });
    }

    const status = emailService.getStatus();
    const results = { sent: 0, failed: 0, total: recipients.length, errors: [], provider: status.provider, mocked: status.mocked };

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    // Send first — respond with job start confirmation, then process in background
    res.json({
      ok: true,
      message: `Sponsor blast started — sending to ${recipients.length} companies.`,
      provider: status.provider,
      mocked: status.mocked,
    });

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
        await emailService.send({
          to:          rec.email,
          toName:      rec.name,
          subject:     personalisedSubject,
          htmlBody:    personalised,
          fromName,
          fromEmail,
          attachments,
        });
        results.sent++;
        console.log(`[sponsor-blast] ✓ [${i + 1}/${recipients.length}] ${rec.company} <${rec.email}>`);
      } catch (e) {
        results.failed++;
        if (results.errors.length < 10) {
          results.errors.push({ email: rec.email, company: rec.company, error: e.message });
        }
        console.error(`[sponsor-blast] ✗ ${rec.email}:`, e.message);
      }

      // Rate-limit delay between sends (skip after last one)
      if (i < recipients.length - 1) {
        await delay(delayMs);
      }
    }

    console.log(`[sponsor-blast] Done — ${results.sent} sent, ${results.failed} failed.`);
  } catch (err) {
    console.error("[email/sponsor-blast]", err.message);
    // Headers already sent — just log
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
});

export default router;