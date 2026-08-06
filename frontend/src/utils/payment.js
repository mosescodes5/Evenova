/* ─────────────────────────────────────────────────────────────
   5c. KORAPAY PAYMENT HELPER

   All checkout payments use EVENOVA'S OWN platform Korapay key — money
   from every ticket sale lands in Evenova's Korapay account, not the
   organizer's. Organizers are credited in their Evenova wallet instead
   (see /api/payments/verify crediting the wallet server-side) and withdraw
   from there. This is why the key is read from a platform env var, not
   from event.paymentConfig / an organizer's own settings.
───────────────────────────────────────────────────────────── */

const PLATFORM_KORAPAY_KEY = import.meta.env.VITE_KORAPAY_PUBLIC_KEY || "";

export function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

// amount is in whole Naira (Korapay's base unit — not kobo).
export async function openKorapayCheckout({ email, name, amount, eventTitle, onSuccess, onClose }) {
  await loadScript("https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js");
  if (!PLATFORM_KORAPAY_KEY) { throw new Error("Korapay isn't configured on this deployment yet."); }

  const reference = "EVT_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

  window.Korapay.initialize({
    key: PLATFORM_KORAPAY_KEY,
    reference,
    amount,
    currency: "NGN",
    customer: { name, email },
    narration: eventTitle ? `Evenova ticket — ${eventTitle}` : "Evenova ticket purchase",
    onSuccess: () => onSuccess(reference),
    onClose,
    onFailed: onClose,
  });
}
