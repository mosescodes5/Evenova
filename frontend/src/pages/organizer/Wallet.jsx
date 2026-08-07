import { useEffect, useState, useCallback } from "react";
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Landmark, Bitcoin, CheckCircle } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Btn, Card, Inp, Bdg } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { api } from "../../utils/api.js";
import { KEYS, storGet } from "../../utils/storage.js";

const STATUS_COLOR = { pending: "gold", approved: "blue", paid: "green", rejected: "red" };

export default function Wallet({ notify }) {
  const { mobile } = useMedia();
  const token = storGet(KEYS.TOKEN, null);

  const [balanceNaira, setBalanceNaira] = useState(0);
  const [txns, setTxns] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // withdrawal form state
  const [method, setMethod] = useState("bank");
  const [amount, setAmount] = useState("");
  const [banks, setBanks] = useState([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [cryptoAsset, setCryptoAsset] = useState("USDT");
  const [cryptoNetwork, setCryptoNetwork] = useState("TRC20");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, history, wds] = await Promise.all([
        api.getWalletBalance(token),
        api.getWalletTransactions(token),
        api.listMyWithdrawals(token),
      ]);
      setBalanceNaira(bal.balanceNaira);
      setTxns(history);
      setWithdrawals(wds);
    } catch (e) {
      notify("Couldn't load wallet: " + (e.message || ""), "error");
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (method === "bank" && showForm && banks.length === 0) {
      api.listBanks(token).then(setBanks).catch(() => {});
    }
  }, [method, showForm, banks.length, token]);

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

  const submitWithdrawal = async () => {
    const amtNum = Number(amount);
    if (!amtNum || amtNum <= 0) { notify("Enter a valid amount", "error"); return; }
    if (amtNum > balanceNaira) { notify("That's more than your current balance", "error"); return; }

    let payload = { amountNaira: amtNum, method };
    if (method === "bank") {
      if (!bankCode || !accountNumber || !accountName) { notify("Complete your bank details and verify the account", "error"); return; }
      const bank = banks.find(b => b.code === bankCode);
      payload = { ...payload, bankCode, bankName: bank?.name || "", accountNumber, accountName };
    } else {
      if (!cryptoAsset || !cryptoNetwork || !cryptoAddress) { notify("Complete your crypto payout details", "error"); return; }
      payload = { ...payload, cryptoAsset, cryptoNetwork, cryptoAddress };
    }

    setSubmitting(true);
    try {
      await api.requestWithdrawal(payload, token);
      notify("Withdrawal requested!");
      setShowForm(false);
      setAmount(""); setAccountNumber(""); setAccountName(""); setCryptoAddress("");
      load();
    } catch (e) {
      notify(e.message || "Failed to submit withdrawal", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: mobile ? "16px" : "32px 24px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="outfit" style={{ fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 4 }}>Wallet</h1>
        <p style={{ color: T.muted, fontSize: 14 }}>Your ticket sales, credited automatically. Withdraw whenever you're ready.</p>
      </div>

      {/* Balance card */}
      <Card style={{ padding: 26, marginBottom: 24, background: `linear-gradient(135deg, ${T.accent}18, ${T.accentL}08)`, border: `1px solid ${T.accent}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <WalletIcon size={16} style={{ color: T.accentL }} />
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: T.accentL }}>Available balance</p>
            </div>
            <p className="outfit" style={{ fontSize: 38, fontWeight: 900, color: T.text }}>
              {loading ? "···" : `₦${balanceNaira.toLocaleString()}`}
            </p>
          </div>
          <Btn onClick={() => setShowForm(s => !s)} disabled={balanceNaira <= 0}>
            <ArrowDownCircle size={15} /> Withdraw
          </Btn>
        </div>
      </Card>

      {/* Withdrawal form */}
      {showForm && (
        <Card style={{ padding: 22, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>Request a withdrawal</h3>

          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {[["bank", "Bank Transfer", Landmark], ["crypto", "Crypto", Bitcoin]].map(([m, label, Icon]) => (
              <button key={m} onClick={() => setMethod(m)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${method === m ? T.accent : T.border}`,
                  background: method === m ? T.accent + "18" : "transparent",
                  color: method === m ? T.accentL : T.muted, fontSize: 13, fontWeight: 700 }}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          <Inp label="Amount (₦)" type="number" value={amount} onChange={setAmount} placeholder={`Up to ₦${balanceNaira.toLocaleString()}`} />

          {method === "bank" ? (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
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
          ) : (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              <Inp label="Asset" value={cryptoAsset} onChange={setCryptoAsset}
                options={[{value:"USDT",label:"USDT"},{value:"USDC",label:"USDC"},{value:"BTC",label:"BTC"},{value:"ETH",label:"ETH"}]} />
              <Inp label="Network" value={cryptoNetwork} onChange={setCryptoNetwork}
                options={[{value:"TRC20",label:"TRC20 (Tron)"},{value:"ERC20",label:"ERC20 (Ethereum)"},{value:"BEP20",label:"BEP20 (BNB Chain)"},{value:"BTC",label:"Bitcoin network"}]} />
              <Inp label="Wallet Address" value={cryptoAddress} onChange={setCryptoAddress} placeholder="Paste your wallet address" />
              <div style={{ padding: 10, borderRadius: 8, background: T.gold + "12", border: `1px solid ${T.gold}30`, fontSize: 12, color: T.gold, lineHeight: 1.6 }}>
                💡 Crypto payouts are reviewed and sent manually by our team (usually within 24 hours) — double-check your address and network, since crypto transfers can't be reversed.
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <Btn onClick={submitWithdrawal} disabled={submitting}>{submitting ? "Submitting…" : "Submit request"}</Btn>
            <Btn v="secondary" onClick={() => setShowForm(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* Withdrawal history */}
      {withdrawals.length > 0 && (
        <Card style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>Withdrawal history</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {withdrawals.map(w => (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {w.method === "bank" ? <Landmark size={14} style={{ color: T.muted }} /> : <Bitcoin size={14} style={{ color: T.muted }} />}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>₦{(w.amountKobo/100).toLocaleString()}</p>
                    <p style={{ fontSize: 11, color: T.muted }}>{new Date(w.createdAt).toLocaleDateString()} · {w.method === "bank" ? w.bankName : `${w.cryptoAsset} (${w.cryptoNetwork})`}</p>
                  </div>
                </div>
                <Bdg color={STATUS_COLOR[w.status]}>{w.status}</Bdg>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Transaction history */}
      <Card style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>Recent activity</h3>
        {loading && <p style={{ fontSize: 13, color: T.muted }}>Loading…</p>}
        {!loading && txns.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No wallet activity yet — sell your first ticket to see it here.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {txns.map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {t.type === "credit"
                  ? <ArrowUpCircle size={16} style={{ color: T.success }} />
                  : <ArrowDownCircle size={16} style={{ color: T.danger }} />}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t.eventTitle || t.note || (t.type === "credit" ? "Ticket sale" : "Withdrawal")}</p>
                  <p style={{ fontSize: 11, color: T.muted }}>{new Date(t.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: t.type === "credit" ? T.success : T.danger }}>
                {t.type === "credit" ? "+" : "−"}₦{(t.amountKobo/100).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
