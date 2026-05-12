/**
 * whatsappService.js — Meta WhatsApp Cloud API (Official, Free Tier)
 *
 * FREE: 1,000 conversations / month  (resets every 30 days)
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Required env vars (set in Render dashboard):
 *   WHATSAPP_TOKEN     — permanent system user token from Meta
 *   WHATSAPP_PHONE_ID  — Phone Number ID from Meta WhatsApp dashboard
 *
 * Setup: see WHATSAPP_SETUP.md
 */

const BASE_URL    = "https://graph.facebook.com/v19.0";
const META_API_VERSION = "v19.0";

// ─── Credentials ──────────────────────────────────────────────────────────────
function getCredentials() {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    throw new Error(
      "WhatsApp not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in your Render environment variables."
    );
  }

  return { token, phoneId };
}

export function getWhatsAppStatus() {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  return {
    configured: !!(token && phoneId),
    provider:   "meta-cloud-api",
    freeQuota:  "1000 conversations/month",
    tokenSet:   !!token,
    phoneIdSet: !!phoneId,
  };
}

// ─── Phone number formatting ───────────────────────────────────────────────────
/**
 * Normalise to international format without leading +
 * Handles: 08012345678 → 2348012345678
 *          +2348012345678 → 2348012345678
 *          2348012345678 → 2348012345678
 */
export function formatPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0"))   return "234" + digits.slice(1);
  return digits;
}

// ─── Core API call ────────────────────────────────────────────────────────────
async function callApi(phoneId, token, payload) {
  const res = await fetch(`${BASE_URL}/${phoneId}/messages`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error?.message || data?.error?.error_data?.details || `HTTP ${res.status}`;
    const code = data?.error?.code;
    throw new Error(`WhatsApp API error (code ${code}): ${msg}`);
  }

  return data;
}

// ─── Send single text message ──────────────────────────────────────────────────
/**
 * @param {string} to      — phone number (any Nigerian format)
 * @param {string} message — plain text (max 4096 chars)
 */
export async function sendWhatsApp(to, message) {
  const { token, phoneId } = getCredentials();
  const phone = formatPhone(to);

  if (!message?.trim()) throw new Error("Message cannot be empty");
  if (message.length > 4096) throw new Error("Message too long (max 4096 characters)");

  const data = await callApi(phoneId, token, {
    messaging_product: "whatsapp",
    to:                phone,
    type:              "text",
    text:              { body: message, preview_url: false },
  });

  const messageId = data?.messages?.[0]?.id;
  console.log(`[whatsapp] ✓ Sent to ${phone} | msgId: ${messageId}`);
  return { provider: "whatsapp", messageId, to: phone };
}

// ─── Send template message ─────────────────────────────────────────────────────
/**
 * Send a pre-approved template (required for initiating conversations outside 24h window).
 * @param {string} to            — phone number
 * @param {string} templateName  — approved template name (e.g. "hello_world")
 * @param {string} languageCode  — e.g. "en_US"
 * @param {Array}  [components]  — template variable components
 */
export async function sendTemplate(to, templateName, languageCode = "en_US", components = []) {
  const { token, phoneId } = getCredentials();
  const phone = formatPhone(to);

  const payload = {
    messaging_product: "whatsapp",
    to:                phone,
    type:              "template",
    template: {
      name:     templateName,
      language: { code: languageCode },
      ...(components.length ? { components } : {}),
    },
  };

  const data = await callApi(phoneId, token, payload);
  return { provider: "whatsapp-template", messageId: data?.messages?.[0]?.id, to: phone };
}

// ─── Bulk blast ────────────────────────────────────────────────────────────────
/**
 * Send to many recipients with personalisation.
 * IMPORTANT: Each message to a new recipient starts a NEW conversation.
 * Free tier = 1,000 conversations/month.
 *
 * @param {Array}  recipients  — [{ phone, name }]
 * @param {string} message     — supports {name} placeholder
 * @param {number} [delayMs]   — ms between sends (default 1200 to stay under rate limits)
 */
export async function blastWhatsApp(recipients, message, delayMs = 1200) {
  const results = {
    sent:   0,
    failed: 0,
    total:  recipients.length,
    errors: [],
  };

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < recipients.length; i++) {
    const rec         = recipients[i];
    const personalised = message.replace(/{name}/gi, rec.name || "");

    try {
      await sendWhatsApp(rec.phone, personalised);
      results.sent++;
      console.log(`[whatsapp-blast] ✓ [${i + 1}/${recipients.length}] ${rec.name} (${rec.phone})`);
    } catch (err) {
      results.failed++;
      if (results.errors.length < 10) {
        results.errors.push({ phone: rec.phone, name: rec.name, error: err.message });
      }
      console.error(`[whatsapp-blast] ✗ ${rec.phone}:`, err.message);
    }

    if (i < recipients.length - 1) await delay(delayMs);
  }

  console.log(`[whatsapp-blast] Done — ${results.sent} sent, ${results.failed} failed`);
  return results;
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export const whatsappService = {
  send:         sendWhatsApp,
  sendTemplate,
  blast:        blastWhatsApp,
  formatPhone,
  getStatus:    getWhatsAppStatus,
};