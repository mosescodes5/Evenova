import { useState } from "react";
import { CreditCard, Building2, Save, CheckCircle } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Btn, Card } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <Card style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.accent + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} style={{ color: T.accent }} />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</h3>
          {subtitle && <p style={{ fontSize: 12, color: T.muted }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

const PROVIDERS = [
  { id: "none",   label: "🔓 Free / Manual",  desc: "No payment collected. Tickets are issued immediately on registration." },
  { id: "card",   label: "💳 Card Payments (Paystack/Flutterwave)", desc: "Enabled automatically — no setup needed. Sales are credited straight to your Evenova wallet; withdraw anytime from Wallet." },
  { id: "bank",   label: "🏦 Bank Transfer",   desc: "Attendees pay into Evenova's account and upload proof of transfer. Once confirmed, it's credited to your wallet." },
];

export default function PaymentSettings({ org, onSave, notify }) {
  const { mobile } = useMedia();

  const saved = org.paymentConfig || {};
  const [provider, setProvider]       = useState(saved.provider === "paystack" || saved.provider === "flutterwave" ? "card" : (saved.provider || "none"));
  const [saving, setSaving]           = useState(false);
  const [wasSaved, setWasSaved]       = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const cfg = { provider };
      await onSave({ paymentConfig: cfg });
      setWasSaved(true);
      notify("Payment settings saved!");
      setTimeout(() => setWasSaved(false), 3000);
    } catch (e) {
      notify("Failed to save: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: mobile ? "16px" : "32px 24px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="outfit" style={{ fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 4 }}>Payment Settings</h1>
        <p style={{ color: T.muted, fontSize: 14 }}>Choose how attendees pay for tickets to your events.</p>
      </div>

      <Section icon={CreditCard} title="Payment Provider" subtitle="Applied to all your paid events">
        {/* Provider selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {PROVIDERS.map(p => (
            <div key={p.id} onClick={() => setProvider(p.id)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                border: `2px solid ${provider === p.id ? T.accent : T.border}`,
                background: provider === p.id ? T.accent + "12" : "transparent",
                transition: "all .15s" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${provider === p.id ? T.accent : T.muted}`,
                background: provider === p.id ? T.accent : "transparent", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {provider === p.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: provider === p.id ? T.accent : T.text }}>{p.label}</p>
                <p style={{ fontSize: 12, color: T.muted }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Card payments info (no config needed — platform-wide) */}
        {provider === "card" && (
          <div style={{ padding: 16, borderRadius: 12, background: T.success + "12", border: `1px solid ${T.success}30`, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: T.text, lineHeight: 1.7 }}>
              ✅ Nothing to set up — card payments are handled by Evenova directly. Each sale is credited to your wallet as soon as payment is confirmed.
            </p>
          </div>
        )}

        {/* Bank transfer info (no config needed — always Evenova's account) */}
        {provider === "bank" && (
          <div style={{ padding: 16, borderRadius: 12, background: T.gold + "12", border: `1px solid ${T.gold}30`, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: T.text, lineHeight: 1.7 }}>
              💡 Attendees see Evenova's own bank account at checkout, make the transfer, and upload their receipt. Our team confirms receipt and credits your wallet — no bank details needed from you.
            </p>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn onClick={save} disabled={saving} v={wasSaved ? "success" : "primary"}>
            {wasSaved
              ? <><CheckCircle size={14} /> Saved!</>
              : saving ? "Saving…"
              : <><Save size={14} /> Save Settings</>}
          </Btn>
        </div>
      </Section>

      {/* How it works — only show when a real provider is chosen */}
      {provider !== "none" && (
        <Section icon={Building2} title="How it works">
          {provider === "card" && (
            <ol style={{ fontSize: 13, color: T.muted, lineHeight: 2, paddingLeft: 18, margin: 0 }}>
              <li>Attendee fills your registration form and clicks <strong style={{ color: T.text }}>Pay</strong>.</li>
              <li>A secure checkout opens — supports card, bank transfer, USSD, and more.</li>
              <li>On successful payment, the ticket is <strong style={{ color: T.success }}>automatically issued and emailed</strong>, and your wallet is credited.</li>
            </ol>
          )}
          {provider === "bank" && (
            <ol style={{ fontSize: 13, color: T.muted, lineHeight: 2, paddingLeft: 18, margin: 0 }}>
              <li>Attendee fills your form and sees Evenova's bank account details.</li>
              <li>They make a bank transfer and upload a screenshot or PDF of the receipt.</li>
              <li>Our team confirms the transfer was received (usually within a few hours).</li>
              <li>Once confirmed, the ticket is <strong style={{ color: T.success }}>issued and emailed automatically</strong>, and your <strong style={{ color: T.text }}>wallet is credited</strong>.</li>
            </ol>
          )}
        </Section>
      )}
    </div>
  );
}