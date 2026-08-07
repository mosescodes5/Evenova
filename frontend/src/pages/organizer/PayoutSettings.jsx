import { useEffect, useState } from "react";
import { Landmark, Save, CheckCircle, ShieldCheck } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Btn, Card, Inp } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { api } from "../../utils/api.js";
import { KEYS, storGet } from "../../utils/storage.js";

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

// Organizers set this once here instead of retyping their bank details every
// time they withdraw — the Wallet page's withdrawal form uses whatever is
// saved here by default. Card payments are always handled by Korapay
// automatically, so there's nothing to configure for that side; this page is
// purely about where payouts land.
export default function PayoutSettings({ org, onSave, notify }) {
  const { mobile } = useMedia();
  const token = storGet(KEYS.TOKEN, null);

  const saved = org.payoutAccount || {};
  const [banks, setBanks] = useState([]);
  const [bankCode, setBankCode] = useState(saved.bankCode || "");
  const [accountNumber, setAccountNumber] = useState(saved.accountNumber || "");
  const [accountName, setAccountName] = useState(saved.accountName || "");
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wasSaved, setWasSaved] = useState(false);

  useEffect(() => {
    api.listBanks(token).then(setBanks).catch(() => {});
  }, [token]);

  const resolveAccount = async () => {
    if (!accountNumber || accountNumber.length < 10 || !bankCode) return;
    setResolving(true);
    try {
      const r = await api.resolveBankAccount(accountNumber, bankCode, token);
      setAccountName(r.accountName);
    } catch (e) {
      setAccountName("");
      notify(e.message || "Couldn't verify that account", "error");
    } finally {
      setResolving(false);
    }
  };

  const save = async () => {
    if (!bankCode || !accountNumber || !accountName) {
      notify("Complete your bank details and verify the account first", "error");
      return;
    }
    setSaving(true);
    try {
      const bank = banks.find(b => b.code === bankCode);
      const payoutAccount = { bankCode, bankName: bank?.name || saved.bankName || "", accountNumber, accountName };
      await onSave({ payoutAccount });
      setWasSaved(true);
      notify("Payout account saved!");
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
        <h1 className="outfit" style={{ fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 4 }}>Payout Account</h1>
        <p style={{ color: T.muted, fontSize: 14 }}>Where your ticket sales get sent when you withdraw from your Wallet.</p>
      </div>

      <div style={{ padding: 16, borderRadius: 12, background: T.success + "12", border: `1px solid ${T.success}30`, marginBottom: 20, display: "flex", gap: 10 }}>
        <ShieldCheck size={16} style={{ color: T.success, flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: T.text, lineHeight: 1.7 }}>
          Every ticket sale is collected by Korapay automatically — there's nothing to set up for accepting payments. Just add the bank account below so you can withdraw your balance whenever you're ready.
        </p>
      </div>

      <Section icon={Landmark} title="Bank account" subtitle="Used to pre-fill withdrawal requests from your Wallet">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Inp label="Bank" value={bankCode} onChange={v => { setBankCode(v); setAccountName(""); }}
            options={banks.map(b => ({ value: b.code, label: b.name }))} />
          <Inp label="Account Number" value={accountNumber}
            onChange={v => { setAccountNumber(v); setAccountName(""); }}
            placeholder="0123456789" />
          {resolving && <p style={{ fontSize: 12, color: T.muted }}>Verifying account…</p>}
          {accountName && (
            <div style={{ padding: 10, borderRadius: 8, background: T.success + "12", border: `1px solid ${T.success}30`, fontSize: 13, color: T.success, display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle size={13} /> {accountName}
            </div>
          )}
          {!resolving && accountNumber?.length >= 10 && bankCode && !accountName && (
            <Btn sz="sm" v="secondary" onClick={resolveAccount}>Verify account</Btn>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <Btn onClick={save} disabled={saving} v={wasSaved ? "success" : "primary"}>
            {wasSaved
              ? <><CheckCircle size={14} /> Saved!</>
              : saving ? "Saving…"
              : <><Save size={14} /> Save Payout Account</>}
          </Btn>
        </div>
      </Section>
    </div>
  );
}
