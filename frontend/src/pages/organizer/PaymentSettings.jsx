import { useState } from "react";
import { CreditCard, Building2, Save, CheckCircle } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Btn, Card, Inp } from "../../components/ui/index.jsx";
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
  { id: "none",        label: "🔓 Free / Manual",  desc: "No payment collected. Tickets are issued immediately on registration." },
  { id: "paystack",    label: "💳 Paystack",        desc: "Automatic card payments. Ticket issued instantly after payment." },
  { id: "flutterwave", label: "🦋 Flutterwave",     desc: "Automatic card payments. Ticket issued instantly after payment." },
  { id: "bank",        label: "🏦 Bank Transfer",   desc: "Attendees pay to your bank account and upload proof of transfer." },
];

export default function PaymentSettings({ org, onSave, notify }) {
  const { mobile } = useMedia();

  const saved = org.paymentConfig || {};
  const [provider, setProvider]       = useState(saved.provider || "none");
  const [paystackKey, setPaystackKey] = useState(saved.paystackKey || "");
  const [flwKey, setFlwKey]           = useState(saved.flwKey || "");
  const [bankName, setBankName]       = useState(saved.bankName || "");
  const [bankAccount, setBankAccount] = useState(saved.bankAccount || "");
  const [bankHolder, setBankHolder]   = useState(saved.bankHolder || "");
  const [saving, setSaving]           = useState(false);
  const [wasSaved, setWasSaved]       = useState(false);

  const save = async () => {
    if (provider === "paystack" && !paystackKey.trim()) {
      notify("Paste your Paystack public key first.", "error"); return;
    }
    if (provider === "flutterwave" && !flwKey.trim()) {
      notify("Paste your Flutterwave public key first.", "error"); return;
    }
    if (provider === "bank") {
      if (!bankName.trim() || !bankAccount.trim() || !bankHolder.trim()) {
        notify("Fill in all bank details.", "error"); return;
      }
    }
    setSaving(true);
    try {
      const cfg = { provider, paystackKey: paystackKey.trim(), flwKey: flwKey.trim(), bankName: bankName.trim(), bankAccount: bankAccount.trim(), bankHolder: bankHolder.trim() };
      await onSave({ paymentConfig: cfg });
      // Expose globally so PublicEventPage can read it at runtime
      window._evPayCfg = cfg;
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

        {/* Paystack fields */}
        {provider === "paystack" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <Inp label="Paystack Public Key" value={paystackKey} onChange={setPaystackKey} placeholder="pk_live_xxxxxxxxxxxxxxxxxxxx" />
            <p style={{ fontSize: 11, color: T.muted }}>
              Get your key from{" "}
              <a href="https://dashboard.paystack.com/#/settings/developer" target="_blank" rel="noreferrer" style={{ color: T.accentL }}>
                Paystack Dashboard → Settings → API Keys & Webhooks
              </a>
            </p>
          </div>
        )}

        {/* Flutterwave fields */}
        {provider === "flutterwave" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <Inp label="Flutterwave Public Key" value={flwKey} onChange={setFlwKey} placeholder="FLWPUBK-xxxxxxxxxxxxxxxxxxxx-X" />
            <p style={{ fontSize: 11, color: T.muted }}>
              Get your key from{" "}
              <a href="https://dashboard.flutterwave.com/dashboard/settings/apis" target="_blank" rel="noreferrer" style={{ color: T.accentL }}>
                Flutterwave Dashboard → Settings → APIs
              </a>
            </p>
          </div>
        )}

        {/* Bank transfer fields */}
        {provider === "bank" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <Inp label="Bank Name" value={bankName} onChange={setBankName} placeholder="e.g. Guaranty Trust Bank" />
            <Inp label="Account Number" value={bankAccount} onChange={setBankAccount} placeholder="0123456789" />
            <Inp label="Account Name" value={bankHolder} onChange={setBankHolder} placeholder="Your name or company name" />
            <div style={{ padding: 10, borderRadius: 10, background: T.gold + "12", border: `1px solid ${T.gold + "30"}`, fontSize: 12, color: T.gold, lineHeight: 1.7 }}>
              💡 Attendees will see these details at checkout, make the transfer, and upload their receipt.
              You review and approve pending payments in <strong>Event Detail → Pending Payments</strong>.
            </div>
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
          {provider === "paystack" && (
            <ol style={{ fontSize: 13, color: T.muted, lineHeight: 2, paddingLeft: 18, margin: 0 }}>
              <li>Attendee fills your registration form and clicks <strong style={{ color: T.text }}>Pay with Paystack</strong>.</li>
              <li>Paystack checkout opens — supports card, bank transfer, USSD, and more.</li>
              <li>On successful payment, the ticket is <strong style={{ color: T.success }}>automatically issued and emailed</strong>.</li>
            </ol>
          )}
          {provider === "flutterwave" && (
            <ol style={{ fontSize: 13, color: T.muted, lineHeight: 2, paddingLeft: 18, margin: 0 }}>
              <li>Attendee fills your registration form and clicks <strong style={{ color: T.text }}>Pay with Flutterwave</strong>.</li>
              <li>Flutterwave checkout opens — supports card, bank transfer, mobile money, and more.</li>
              <li>On successful payment, the ticket is <strong style={{ color: T.success }}>automatically issued and emailed</strong>.</li>
            </ol>
          )}
          {provider === "bank" && (
            <ol style={{ fontSize: 13, color: T.muted, lineHeight: 2, paddingLeft: 18, margin: 0 }}>
              <li>Attendee fills your form and sees your bank account details.</li>
              <li>They make a bank transfer and upload a screenshot or PDF of the receipt.</li>
              <li>You review the receipt in <strong style={{ color: T.text }}>Event Detail → Pending Payments</strong>.</li>
              <li>Click <strong style={{ color: T.success }}>Approve</strong> — ticket is issued and emailed automatically.</li>
            </ol>
          )}
        </Section>
      )}
    </div>
  );
}