/**
 * routes/whatsapp.js
 *
 * GET  /api/whatsapp/status  — check WhatsApp configuration
 * POST /api/whatsapp/blast   — send bulk WhatsApp messages
 * POST /api/whatsapp/send    — send a single WhatsApp message
 */

import express from "express";
import { whatsappService } from "../services/whatsappService.js";

const router = express.Router();

/** GET /api/whatsapp/status */
router.get("/status", (req, res) => {
  res.json({ ok: true, ...whatsappService.getStatus() });
});

/** POST /api/whatsapp/send — single message */
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

/** POST /api/whatsapp/blast — bulk personalised messages */
router.post("/blast", async (req, res) => {
  try {
    const { recipients, message, delayMs } = req.body;
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ ok: false, error: "recipients array is required" });
    }
    if (!message?.trim()) {
      return res.status(400).json({ ok: false, error: "message is required" });
    }
    const results = await whatsappService.blast(recipients, message, delayMs);
    res.json({ ok: true, ...results });
  } catch (err) {
    console.error("[whatsapp/blast]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
