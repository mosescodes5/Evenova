import { useEffect, useState, useCallback } from "react";
import { Landmark, CheckCircle, XCircle, FileText } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Btn, Card, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { api } from "../../utils/api.js";
import { KEYS, storGet } from "../../utils/storage.js";

export default function AdminBankTransfers({ notify }) {
  const { mobile } = useMedia();
  const token = storGet(KEYS.TOKEN, null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.listPendingBankTransfers(token));
    } catch (e) {
      notify("Couldn't load bank transfers: " + (e.message || ""), "error");
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => { load(); }, [load]);

  const confirm = async (r) => {
    setBusyId(r.ticketId);
    try {
      await api.confirmBankTransfer(r.eventId, r.ticketId, token);
      notify("Payment confirmed — ticket issued and emailed!");
      load();
    } catch (e) {
      notify(e.message || "Failed to confirm", "error");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (r) => {
    setBusyId(r.ticketId);
    try {
      await api.rejectBankTransfer(r.eventId, r.ticketId, "", token);
      notify("Payment rejected", "error");
      load();
    } catch (e) {
      notify(e.message || "Failed to reject", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: mobile ? "16px" : "32px 24px" }}>
      <h1 className="outfit" style={{ fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 8 }}>Bank Transfers</h1>
      <p style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>
        All bank transfers go into Evenova's own account — confirm receipt here before a ticket becomes valid and the organizer's wallet is credited.
      </p>

      <div className="g3" style={{ marginBottom: 24 }}>
        <StatCard label="Pending Review" value={rows.length} icon={Landmark} color={T.gold} />
      </div>

      {loading && <Card style={{ padding: 40, textAlign: "center" }}><p style={{ color: T.muted }}>Loading…</p></Card>}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((r) => (
            <Card key={r.ticketId} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{r.eventTitle}</h3>
                  <p style={{ fontSize: 13, color: T.muted, marginBottom: 6 }}>{r.holderName} · {r.holderEmail}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: T.gold, marginBottom: 6 }}>₦{Number(r.totalPaid||r.ticketPrice||0).toLocaleString()}</p>
                  <p style={{ fontSize: 11, color: T.muted }}>Submitted {new Date(r.registeredAt).toLocaleString()}</p>

                  {r.receiptUrl ? (
                    r.receiptUrl.startsWith("data:image") ? (
                      <img src={r.receiptUrl} alt="receipt" style={{ maxWidth: 240, maxHeight: 200, borderRadius: 10, objectFit: "contain", border: `1px solid ${T.border}`, display: "block", marginTop: 10 }} />
                    ) : (
                      <a href={r.receiptUrl} target="_blank" rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.accentL, marginTop: 10,
                          padding: "7px 14px", borderRadius: 8, border: `1px solid ${T.border}`, textDecoration: "none" }}>
                        <FileText size={13}/> View Receipt
                      </a>
                    )
                  ) : (
                    <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: T.danger + "12", border: `1px solid ${T.danger}30`, fontSize: 12, color: T.danger }}>
                      ⚠️ No receipt uploaded
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, alignSelf: "flex-start" }}>
                  <Btn sz="sm" v="danger" onClick={() => reject(r)} disabled={busyId === r.ticketId}><XCircle size={13}/>Reject</Btn>
                  <Btn sz="sm" onClick={() => confirm(r)} disabled={busyId === r.ticketId}><CheckCircle size={13}/>Confirm Received</Btn>
                </div>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <Card style={{ padding: 40, textAlign: "center" }}><p style={{ color: T.muted }}>No pending bank transfers</p></Card>}
        </div>
      )}
    </div>
  );
}
