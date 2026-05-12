/**
 * routes/email.js
 *
 * POST /api/email/config      — update provider + keys for this session
 * GET  /api/email/status      — check provider status
 * POST /api/email/test-smtp   — verify SMTP credentials
 * POST /api/email/send        — single transactional email
 * POST /api/email/blast       — bulk personalized email (Brevo → SMTP fallback)
 * POST /api/email/sponsor-blast — bulk email with attachments (sponsorship PDFs etc.)
 */

import express from "express";
import { emailService } from "../services/emailService.js";

const router = express.Router();

/** GET /api/email/status */
router.get("/status", (req, res) => {
  res.json({ ok: true, ...emailService.getStatus() });
});

/** POST /api/email/config */
router.post("/config", (req, res) => {
  const { provider, resendKey, brevoKey, sesUrl, sesKey } = req.body;
  emailService.configure({ provider, resendKey, brevoKey, sesUrl, sesKey });
  res.json({ ok: true, ...emailService.getStatus() });
});

/** POST /api/email/test-smtp */
router.post("/test-smtp", async (req, res) => {
  const result = await emailService.testSmtp();
  res.json(result);
});

/** POST /api/email/send — single email */
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

/**
 * POST /api/email/blast
 * Body: { recipients: [{email, name, company}], subject, htmlBody, fromName, fromEmail, delayMs? }
 *
 * Uses Brevo for bulk (rate-limited at ~5/s), falls back to SMTP if Brevo fails.
 * Responds immediately; processing continues in background.
 */
router.post("/blast", async (req, res) => {
  try {
    const { recipients, subject, htmlBody, fromName, fromEmail, delayMs } = req.body;

    if (!recipients?.length || !subject || !htmlBody) {
      return res.status(400).json({
        ok: false,
        error: "recipients, subject and htmlBody are required",
      });
    }

    const status = emailService.getStatus();

    // Respond immediately so the frontend doesn't time out
    res.json({
      ok:       true,
      message:  `Blast started — sending to ${recipients.length} recipients via ${status.provider}.`,
      provider: status.provider,
      mocked:   status.mocked,
    });

    // Process in background
    emailService
      .blast({ recipients, subject, htmlBody, fromName, fromEmail, delayMs })
      .then((r) => console.log(`[email/blast] Complete — ${r.sent}/${r.total} sent`))
      .catch((err) => console.error("[email/blast] Error:", err.message));

  } catch (err) {
    console.error("[email/blast]", err.message);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
});

/**
 * POST /api/email/sponsor-blast
 * Body: {
 *   recipients: [{email, name, company}],
 *   subject, htmlBody, fromName, fromEmail,
 *   attachments: [{filename, content (base64), contentType}],
 *   delayMs?
 * }
 *
 * Brevo supports up to 3 attachments per email natively.
 * Falls back to SMTP if Brevo is not configured.
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
      delayMs,
    } = req.body;

    if (!recipients?.length || !subject || !htmlBody) {
      return res.status(400).json({ ok: false, error: "recipients, subject and htmlBody are required" });
    }

    if (attachments.length > 3) {
      return res.status(400).json({ ok: false, error: "Maximum 3 attachments per email" });
    }

    const totalB64 = attachments.reduce((s, a) => s + (a.content?.length || 0), 0);
    if (totalB64 > 11_000_000) {
      return res.status(400).json({ ok: false, error: "Total attachment size too large (max ~8 MB decoded)" });
    }

    const status = emailService.getStatus();

    res.json({
      ok:       true,
      message:  `Sponsor blast started — sending to ${recipients.length} companies via ${status.provider}.`,
      provider: status.provider,
      mocked:   status.mocked,
    });

    emailService
      .blast({ recipients, subject, htmlBody, fromName, fromEmail, attachments, delayMs })
      .then((r) => console.log(`[sponsor-blast] Complete — ${r.sent}/${r.total} sent`))
      .catch((err) => console.error("[sponsor-blast] Error:", err.message));

  } catch (err) {
    console.error("[email/sponsor-blast]", err.message);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
});

export default router;