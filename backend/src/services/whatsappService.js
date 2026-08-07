/**
 * WhatsApp messaging via Meta Cloud API (free tier)
 * Free: 1,000 conversations/month
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Required env vars:
 *   WHATSAPP_TOKEN        — your permanent access token from Meta
 *   WHATSAPP_PHONE_ID     — your WhatsApp phone number ID from Meta
 */

const BASE_URL = "https://graph.facebook.com/v19.0";

function getCredentials() {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    throw new Error("WHATSAPP_TOKEN and WHATSAPP_PHONE_ID must be set in your .env");
  }
  return { token, phoneId };
}

/**
 * Format a Nigerian phone number to international format (234XXXXXXXXXX)
 * Handles: 08012345678, +2348012345678, 2348012345678
 */
function formatPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234"))  return digits;
  if (digits.startsWith("0"))    return "234" + digits.slice(1);
  return digits;
}

/**
 * Send a plain text WhatsApp message
 * @param {string} to      — phone number (any Nigerian format)
 * @param {string} message — plain text message
 */
export async function sendWhatsApp(to, message) {
  const { token, phoneId } = getCredentials();
  const phone = formatPhone(to);

  const res = await fetch(`${BASE_URL}/${phoneId}/messages`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      Authorization:   `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to:                phone,
      type:              "text",
      text:              { body: message },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`WhatsApp: ${err?.error?.message || res.status}`);
  }

  const data = await res.json();
  return { provider: "whatsapp", messageId: data?.messages?.[0]?.id, to: phone };
}

/**
 * Send WhatsApp messages to multiple recipients
 * @param {Array}  recipients  — [{ phone, name }]
 * @param {string} message     — supports {name} placeholder
 * @param {number} delayMs     — ms between sends (default 1000)
 */
export async function blastWhatsApp(recipients, message, delayMs = 1000) {
  const results = { sent: 0, failed: 0, total: recipients.length, errors: [] };
  const delay   = ms => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < recipients.length; i++) {
    const rec = recipients[i];
    const personalised = message.replace(/{name}/g, rec.name || "");

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

  return results;
}

export const whatsappService = { send: sendWhatsApp, blast: blastWhatsApp, formatPhone };
