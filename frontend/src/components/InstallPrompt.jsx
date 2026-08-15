import { useEffect, useState } from "react";
import { Share, PlusSquare, X, Download } from "lucide-react";
import { T } from "../styles/theme.js";

const DISMISS_KEY = "evenova_install_prompt_dismissed_at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // don't re-nag for 14 days after a dismiss

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true // iOS Safari's own flag
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !window.MSStream;
}

/**
 * Prompts the person to install Evenova to their home screen.
 *
 * Android/Chrome: listens for the browser's own `beforeinstallprompt`
 * event and shows a button that triggers the real native install dialog.
 *
 * iOS Safari: there's no equivalent browser API — Apple deliberately
 * doesn't expose one, installation is only ever a manual "Share ->
 * Add to Home Screen" action. So on iOS this shows a small instructional
 * banner instead, since there's nothing to programmatically trigger.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed, nothing to do

    const lastDismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - lastDismissed < DISMISS_COOLDOWN_MS) return;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (isIOS()) {
      // Small delay so it doesn't compete with the initial page load.
      const t = setTimeout(() => setShowIOSBanner(true), 2500);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", handleBeforeInstall); };
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setShowIOSBanner(false);
    setDeferredPrompt(null);
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice; // resolves once the person accepts/declines the native dialog
    setDeferredPrompt(null);
  };

  if (dismissed) return null;
  if (!deferredPrompt && !showIOSBanner) return null;

  return (
    <div style={{
      position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 9999,
      maxWidth: 420, margin: "0 auto",
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
      padding: "14px 16px", boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <img src="/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>Install Evenova</p>
        {deferredPrompt ? (
          <p style={{ fontSize: 11.5, color: T.muted }}>Add to your home screen for quick access.</p>
        ) : (
          <p style={{ fontSize: 11.5, color: T.muted, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            Tap <Share size={12} style={{ display: "inline", verticalAlign: "middle" }} /> then
            <PlusSquare size={12} style={{ display: "inline", verticalAlign: "middle" }} /> "Add to Home Screen"
          </p>
        )}
      </div>

      {deferredPrompt && (
        <button onClick={handleAndroidInstall} style={{
          background: T.accent, color: "white", border: "none", borderRadius: 10,
          padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        }}>
          <Download size={13} /> Install
        </button>
      )}

      <button onClick={dismiss} aria-label="Dismiss" style={{
        background: "none", border: "none", color: T.muted, cursor: "pointer",
        padding: 4, flexShrink: 0,
      }}>
        <X size={16} />
      </button>
    </div>
  );
}
