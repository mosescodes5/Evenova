/* ─────────────────────────────────────────────────────────────
   5c. PAYSTACK / FLUTTERWAVE PAYMENT HELPERS
───────────────────────────────────────────────────────────── */


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
  const key = window._evPayCfg.paystackKey;
  if (!key) { throw new Error("Paystack public key not configured. Go to Event Settings → Payment."); }
  const handler = window.PaystackPop.setup({
    key,
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
  const key = window._evPayCfg.flwKey;
  if (!key) { throw new Error("Flutterwave public key not configured. Go to Event Settings → Payment."); }
  window.FlutterwaveCheckout({
    public_key: key,
    tx_ref: "EVT_" + Date.now(),
    amount,
    currency: "NGN",
    customer: { email, name, phone_number: phone },
    customizations: { title: eventTitle, description: "Evenova ticket purchase" },
    callback: (resp) => { if (resp.status === "successful") onSuccess(resp.transaction_id); },
    onclose: onClose,
  });
}

