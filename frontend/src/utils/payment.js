/* ─────────────────────────────────────────────────────────────
   5c. PAYSTACK / FLUTTERWAVE PAYMENT HELPERS

   All checkout payments use EVENOVA'S OWN platform keys — money from every
   ticket sale lands in Evenova's Paystack/Flutterwave account, not the
   organizer's. Organizers are credited in their Evenova wallet instead
   (see /api/payments/verify crediting the wallet server-side) and withdraw
   from there. This is why these are read from platform env vars, not from
   event.paymentConfig / an organizer's own settings.
───────────────────────────────────────────────────────────── */

const PLATFORM_PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";
const PLATFORM_FLW_KEY = import.meta.env.VITE_FLW_PUBLIC_KEY || "";

export function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

export async function openPaystackCheckout({ email, name, amount, eventTitle, onSuccess, onClose }) {
  await loadScript("https://js.paystack.co/v2/inline.js");
  if (!PLATFORM_PAYSTACK_KEY) { throw new Error("Paystack isn't configured on this deployment yet."); }
  const handler = window.PaystackPop.setup({
    key: PLATFORM_PAYSTACK_KEY,
    email,
    amount: amount * 100, // kobo
    currency: "NGN",
    metadata: { name, custom_fields: [{ display_name: "Event", value: eventTitle }] },
    callback: (resp) => onSuccess(resp.reference),
    onClose,
  });
  handler.openIframe();
}

export async function openFlutterwaveCheckout({ email, name, phone, amount, eventTitle, onSuccess, onClose }) {
  await loadScript("https://checkout.flutterwave.com/v3.js");
  if (!PLATFORM_FLW_KEY) { throw new Error("Flutterwave isn't configured on this deployment yet."); }
  window.FlutterwaveCheckout({
    public_key: PLATFORM_FLW_KEY,
    tx_ref: "EVT_" + Date.now(),
    amount,
    currency: "NGN",
    customer: { email, name, phone_number: phone },
    customizations: { title: eventTitle, description: "Evenova ticket purchase" },
    callback: (resp) => { if (resp.status === "successful") onSuccess(resp.transaction_id); },
    onclose: onClose,
  });
}

