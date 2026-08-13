import { useEffect, useState, useCallback } from "react";
import { Tag, Plus, Trash2, Copy, CheckCircle, XCircle, Users, ListChecks } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Btn, Card, Inp, Bdg, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { api } from "../../utils/api.js";
import { KEYS, storGet } from "../../utils/storage.js";

export default function AdminDiscountCodes({ notify }) {
  const { mobile } = useMedia();
  const token = storGet(KEYS.TOKEN, null);
  const [tab, setTab] = useState("codes");

  const [codes, setCodes] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", discountPct: "5", maxRedemptions: "", maxRedemptionsPerOrg: "1", expiresAt: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, w] = await Promise.all([api.listDiscountCodes(token), api.listWaitlist(token)]);
      setCodes(c); setWaitlist(w);
    } catch (e) {
      notify("Couldn't load: " + (e.message || ""), "error");
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => { load(); }, [load]);

  const setF = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const createCode = async () => {
    if (!form.discountPct || Number(form.discountPct) <= 0) {
      notify("Enter a discount percentage", "error"); return;
    }
    setSaving(true);
    try {
      await api.createDiscountCode({
        code: form.code || undefined,
        discountPct: Number(form.discountPct),
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        maxRedemptionsPerOrg: Number(form.maxRedemptionsPerOrg) || 1,
        expiresAt: form.expiresAt || undefined,
        notes: form.notes || undefined,
      }, token);
      notify("Discount code created");
      setForm({ code: "", discountPct: "5", maxRedemptions: "", maxRedemptionsPerOrg: "1", expiresAt: "", notes: "" });
      setShowForm(false);
      load();
    } catch (e) {
      notify(e.message || "Failed to create code", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c) => {
    try {
      await api.updateDiscountCode(c.id, { active: !c.active }, token);
      load();
    } catch (e) { notify(e.message || "Failed to update", "error"); }
  };

  const removeCode = async (c) => {
    if (!window.confirm(`Delete code "${c.code}"? Organizers who redeemed it will lose the discount.`)) return;
    try {
      await api.deleteDiscountCode(c.id, token);
      notify("Code deleted");
      load();
    } catch (e) { notify(e.message || "Failed to delete", "error"); }
  };

  const copyCode = (c) => {
    navigator.clipboard?.writeText(c.code);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const markWaitlistStatus = async (w, status) => {
    try {
      await api.updateWaitlistStatus(w.id, status, token);
      load();
    } catch (e) { notify(e.message || "Failed to update", "error"); }
  };

  const activeCount = codes.filter(c => c.active).length;
  const totalRedemptions = codes.reduce((s, c) => s + c.redemptionsCount, 0);
  const waitlistPaidCount = waitlist.filter(w => w.hostingPaidEvents).length;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: mobile ? "16px" : "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 className="outfit" style={{ fontSize: 26, fontWeight: 800, color: T.text }}>Discount Codes & Waitlist</h1>
        {tab === "codes" && <Btn sz="sm" onClick={() => setShowForm(s => !s)}><Plus size={14}/>New Code</Btn>}
      </div>

      <div className="g3" style={{ marginBottom: 24 }}>
        <StatCard label="Active Codes" value={activeCount} icon={Tag} color={T.accent} />
        <StatCard label="Total Redemptions" value={totalRedemptions} icon={CheckCircle} color={T.success} />
        <StatCard label="Waitlist (Paid Events)" value={waitlistPaidCount} icon={Users} color={T.gold} sub={`${waitlist.length} total signups`} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["codes","Discount Codes"],["waitlist","Waitlist"]].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${tab === v ? T.accent : T.border}`,
              background: tab === v ? T.accent + "20" : "transparent",
              color: tab === v ? T.accentL : T.muted }}>{l}</button>
        ))}
      </div>

      {tab === "codes" && showForm && (
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>New discount code</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="g2">
              <Inp label="Code (leave blank to auto-generate)" value={form.code} onChange={setF("code")} placeholder="WAITLIST5" />
              <Inp label="Discount % off the service fee" type="number" value={form.discountPct} onChange={setF("discountPct")} />
            </div>
            <div className="g2">
              <Inp label="Max total redemptions (blank = unlimited)" type="number" value={form.maxRedemptions} onChange={setF("maxRedemptions")} />
              <Inp label="Max redemptions per organizer" type="number" value={form.maxRedemptionsPerOrg} onChange={setF("maxRedemptionsPerOrg")} />
            </div>
            <Inp label="Expires (optional)" type="date" value={form.expiresAt} onChange={setF("expiresAt")} />
            <Inp label="Notes (internal, e.g. 'Waitlist launch perk')" value={form.notes} onChange={setF("notes")} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn v="secondary" sz="sm" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn sz="sm" onClick={createCode} disabled={saving}>{saving ? "Creating…" : "Create Code"}</Btn>
            </div>
          </div>
        </Card>
      )}

      {loading && <Card style={{ padding: 40, textAlign: "center" }}><p style={{ color: T.muted }}>Loading…</p></Card>}

      {!loading && tab === "codes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {codes.map(c => (
            <Card key={c.id} style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: ".03em" }}>{c.code}</span>
                    <button onClick={() => copyCode(c)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "flex" }}>
                      {copiedId === c.id ? <CheckCircle size={13} style={{ color: T.success }}/> : <Copy size={13}/>}
                    </button>
                    <Bdg color={c.active ? "green" : "red"}>{c.active ? "active" : "inactive"}</Bdg>
                  </div>
                  <p style={{ fontSize: 13, color: T.muted }}>
                    <strong style={{ color: T.text }}>{c.discountPct}%</strong> off the service fee ·
                    {" "}{c.redemptionsCount}{c.maxRedemptions ? `/${c.maxRedemptions}` : ""} redeemed ·
                    {" "}max {c.maxRedemptionsPerOrg}/organizer
                  </p>
                  {c.expiresAt && <p style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Expires {new Date(c.expiresAt).toLocaleDateString()}</p>}
                  {c.notes && <p style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{c.notes}</p>}
                </div>
                <div style={{ display: "flex", gap: 8, alignSelf: "flex-start" }}>
                  <Btn sz="sm" v="secondary" onClick={() => toggleActive(c)}>{c.active ? "Deactivate" : "Activate"}</Btn>
                  <Btn sz="sm" v="danger" onClick={() => removeCode(c)}><Trash2 size={13}/></Btn>
                </div>
              </div>
            </Card>
          ))}
          {codes.length === 0 && <Card style={{ padding: 40, textAlign: "center" }}><p style={{ color: T.muted }}>No discount codes yet — create one above.</p></Card>}
        </div>
      )}

      {!loading && tab === "waitlist" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {waitlist.map(w => (
            <Card key={w.id} style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{w.name}</h3>
                    {w.hostingPaidEvents && <Bdg color="gold">hosting paid events</Bdg>}
                    <Bdg color={w.status === "converted" ? "green" : w.status === "invited" ? "blue" : "gray"}>{w.status}</Bdg>
                  </div>
                  <p style={{ fontSize: 12, color: T.muted }}>{w.email}{w.phone ? ` · ${w.phone}` : ""}</p>
                  <p style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Joined {new Date(w.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignSelf: "flex-start" }}>
                  {w.status !== "invited" && <Btn sz="sm" v="secondary" onClick={() => markWaitlistStatus(w, "invited")}>Mark Invited</Btn>}
                  {w.status !== "converted" && <Btn sz="sm" onClick={() => markWaitlistStatus(w, "converted")}><CheckCircle size={13}/>Mark Converted</Btn>}
                </div>
              </div>
            </Card>
          ))}
          {waitlist.length === 0 && <Card style={{ padding: 40, textAlign: "center" }}><p style={{ color: T.muted }}>No one's joined the waitlist yet.</p></Card>}
        </div>
      )}
    </div>
  );
}
