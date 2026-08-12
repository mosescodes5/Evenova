/**
 * routes/qr.js
 *
 * GET /api/qr?data=<string>&size=400
 *
 * Renders a QR code as a real PNG image. This exists specifically so ticket
 * QR codes can be embedded in emails as a normal <img src="https://...">
 * instead of a base64 data: URI — most major mail clients (Gmail, Outlook,
 * Yahoo) strip data: URIs from <img src> for security reasons, which is why
 * QR codes weren't showing up in ticket emails. A real HTTPS image URL
 * renders everywhere.
 *
 * Intentionally public/unauthenticated — the recipient's mail client has no
 * auth context when it fetches images, and the `data` param is just
 * whatever string the caller wants rendered (already public in the email
 * itself as a fallback), so there's nothing sensitive being exposed here.
 */
import express from "express";
import QRCode from "qrcode";

const router = express.Router();

const MAX_DATA_LENGTH = 2000;
const MIN_SIZE = 100;
const MAX_SIZE = 800;
const DEFAULT_SIZE = 320;

router.get("/", async (req, res, next) => {
  try {
    const data = req.query.data;
    if (!data || typeof data !== "string") {
      return res.status(400).json({ error: "Missing required query param: data" });
    }
    if (data.length > MAX_DATA_LENGTH) {
      return res.status(400).json({ error: `data is too long (max ${MAX_DATA_LENGTH} characters)` });
    }

    let size = parseInt(req.query.size, 10) || DEFAULT_SIZE;
    size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, size));

    const buffer = await QRCode.toBuffer(data, {
      type: "png",
      width: size,
      margin: 1,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    });

    // QR content is deterministic for a given (data, size) pair, so this is
    // safe to cache aggressively — email clients will re-fetch this image
    // every time they render the email otherwise.
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(buffer);
  } catch (err) { next(err); }
});

export default router;
