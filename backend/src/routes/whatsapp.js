import express from "express";
import { whatsappService } from "../services/whatsappService.js";

const router = express.Router();

/**
 * GET /api/whatsapp/status
 * Check if WhatsApp credentials are configured
 */
router.get("/status", (req, res) => {
  const configured = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
  res.json({ ok: true, configured, provider: "meta-cloud-api" });
});

/**
 * POST /api/whatsapp/send
 * Send a single WhatsApp message
 * Body: { to, message }
 */
router.post("/send", async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ ok: false, error: "to and message are required" });
    }
    const result = await whatsappService.send(to, message);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[whatsapp/send]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/blast
 * Send WhatsApp messages to multiple recipients
 * Body: {
 *   recipients: [{ phone, name }],
 *   message:    string  (supports {name} placeholder),
 *   delayMs:    number  (default 1000)
 * }
 */
router.post("/blast", async (req, res) => {
  try {
    const { recipients, message, delayMs = 1000 } = req.body;
    if (!recipients?.length || !message) {
      return res.status(400).json({ ok: false, error: "recipients and message are required" });
    }

    // Respond immediately, process in background
    res.json({
      ok:      true,
      message: `WhatsApp blast started — sending to ${recipients.length} recipients.`,
    });

    const results = await whatsappService.blast(recipients, message, delayMs);
    console.log(`[whatsapp/blast] Done — ${results.sent} sent, ${results.failed} failed.`);
  } catch (err) {
    console.error("[whatsapp/blast]", err.message);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
});

export default router;
