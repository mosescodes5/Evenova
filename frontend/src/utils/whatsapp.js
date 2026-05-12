/**
 * utils/whatsapp.js — Frontend helper for the WhatsApp API routes
 *
 * Wraps POST /api/whatsapp/blast and GET /api/whatsapp/status
 */

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Send a bulk WhatsApp blast via the backend.
 * @param {{ phone: string, name: string }[]} recipients
 * @param {string} message  — supports {name} placeholder
 * @param {number} [delayMs]
 */
export async function sendWhatsAppBlast(recipients, message, delayMs = 1500) {
  const res = await fetch(`${API}/api/whatsapp/blast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipients, message, delayMs }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data; // { sent, failed, total, errors }
}

/**
 * Send a single WhatsApp message via the backend.
 * @param {string} to
 * @param {string} message
 */
export async function sendWhatsAppMessage(to, message) {
  const res = await fetch(`${API}/api/whatsapp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, message }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data; // { provider, messageId, to }
}

/**
 * Check WhatsApp backend configuration status.
 */
export async function getWhatsAppStatus() {
  try {
    const res  = await fetch(`${API}/api/whatsapp/status`);
    const data = await res.json().catch(() => ({}));
    return data;
  } catch {
    return { configured: false, error: "Backend not reachable" };
  }
}
