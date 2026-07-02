import { useEffect, useState, useCallback } from "react";
import { Landmark, Bitcoin, CheckCircle, XCircle, Clock } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Btn, Card, Bdg, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { api } from "../../utils/api.js";
import { KEYS, storGet } from "../../utils/storage.js";

const STATUS_COLOR = { pending: "gold", approved: "blue", paid: "green", rejected: "red" };

export default function AdminWithdrawals({ notify }) {
  const { mobile } = useMedia();
  const token = storGet(KEYS.TOKEN, null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState(null);
  const [txHashInput, setTxHashInput] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.listAllWithdrawals(filter === "all" ? null : filter, token));
    } catch (e) {
      notify("Couldn't load withdrawals: " + (e.message || ""), "error");
    } finally {
      setLoading(false);
    }
  }, [filter, token, notify]);

  useEffect(() => { load(); }, [load]);

  const approve = async (w) => {
    setBusyId(w.id);
    try {
      const res = await api.approveWithdrawal(w.id, token);
      notify(res.message || "Approved");
      load();
    } catch (e) {
      notify(e.message || "Failed to approve", "error");
    } finally {
      setBusyId(null);
    }
  };

  const markPaid = async (w) => {
    setBusyId(w.id);
    try {
      await api.markWithdrawalPaid(w.id, txHashInput[w.id] || "", "", token);
      notify("Marked as paid");
      load();
    } catch (e) {
      notify(e.message || "Failed to mark paid", "error");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (w) => {
    setBusyId(w.id);
    try {
      await api.rejectWithdrawal(w.id, "", token);
      notify("Withdrawal rejected", "error");
      load();
    } catch (e) {
      notify(e.message || "Failed to reject", "error");
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = rows.filter(r => r.status === "pending").length;
  const paidTotal = rows.filter(r => r.status === "paid").reduce((s, r) => s + r.amountKobo, 0) / 100;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: mobile ? "16px" : "32px 24px" }}>
      <h1 className="outfit" style={{ fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 24 }}>Payouts</h1>

      <div className="g3" style={{ marginBottom: 24 }}>
        <StatCard label="Pending Requests" value={pendingCount} icon={Clock} color={T.gold} />
        <StatCard label="Total Paid Out" value={`₦${paidTotal.toLocaleString()}`} icon={CheckCircle} color={T.success} />
        <StatCard label="Total Requests" value={rows.length} icon={Landmark} color={T.info} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["pending","Pending"],["approved","Approved"],["paid","Paid"],["rejected","Rejected"],["all","All"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${filter === v ? T.accent : T.border}`,
              background: filter === v ? T.accent + "20" : "transparent",
              color: filter === v ? T.accentL : T.muted }}>{l}</button>
        ))}
      </div>

      {loading && <Card style={{ padding: 40, textAlign: "center" }}><p style={{ color: T.muted }}>Loading…</p></Card>}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map(w => (
            <Card key={w.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    {w.method === "bank" ? <Landmark size={15} style={{ color: T.muted }} /> : <Bitcoin size={15} style={{ color: T.muted }} />}
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{w.orgName}</h3>
                    <Bdg color={STATUS_COLOR[w.status]}>{w.status}</Bdg>
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 6 }}>₦{(w.amountKobo/100).toLocaleString()}</p>
                  {w.method === "bank" ? (
                    <p style={{ fontSize: 12, color: T.muted }}>{w.bankName} · {w.accountNumber} · {w.accountName}</p>
                  ) : (
                    <p style={{ fontSize: 12, color: T.muted, wordBreak: "break-all" }}>{w.cryptoAsset} ({w.cryptoNetwork}) → {w.cryptoAddress}</p>
                  )}
                  <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Requested {new Date(w.createdAt).toLocaleString()}</p>
                  {w.providerReference && <p style={{ fontSize: 11, color: T.muted }}>Ref: {w.providerReference}</p>}
                </div>

                {w.status === "pending" && (
                  <div style={{ display: "flex", gap: 8, alignSelf: "flex-start" }}>
                    <Btn sz="sm" v="danger" onClick={() => reject(w)} disabled={busyId === w.id}><XCircle size={13}/>Reject</Btn>
                    <Btn sz="sm" onClick={() => approve(w)} disabled={busyId === w.id}>
                      <CheckCircle size={13}/>{w.method === "bank" ? "Approve & Pay via Paystack" : "Approve"}
                    </Btn>
                  </div>
                )}

                {w.status === "approved" && w.method === "crypto" && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input placeholder="Transaction hash" value={txHashInput[w.id] || ""}
                      onChange={e => setTxHashInput(s => ({ ...s, [w.id]: e.target.value }))}
                      style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: 12, width: 200 }} />
                    <Btn sz="sm" onClick={() => markPaid(w)} disabled={busyId === w.id}>Mark Paid</Btn>
                  </div>
                )}
              </div>
            </Card>
          ))}
          {rows.length === 0 && <Card style={{ padding: 40, textAlign: "center" }}><p style={{ color: T.muted }}>No withdrawals in this category</p></Card>}
        </div>
      )}
    </div>
  );
}
