import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, Heart, Plus, Trash2, Copy, CheckCircle, XCircle, HelpCircle, Clock, Users, Search } from "lucide-react";
import { T } from "../../styles/theme.js";
import { Btn, Card, Inp, Bdg, StatCard } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";
import { api } from "../../utils/api.js";
import { KEYS, storGet } from "../../utils/storage.js";

const STATUS_META = {
  pending:   { label: "Awaiting reply", color: "gray",   Icon: Clock },
  attending: { label: "Attending",      color: "green",  Icon: CheckCircle },
  declined:  { label: "Declined",       color: "red",    Icon: XCircle },
  maybe:     { label: "Maybe",          color: "gold",   Icon: HelpCircle },
};

export default function WeddingGuests({ event, onBack, notify }) {
  const { mobile } = useMedia();
  const token = storGet(KEYS.TOKEN, null);

  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name:"", partyLabel:"", maxPartySize:"1" });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.listWeddingGuests(event.id, token)
      .then(setGuests)
      .catch(e => notify?.(e.message || "Couldn't load guest list", "error"))
      .finally(() => setLoading(false));
  }, [event.id, token, notify]);

  useEffect(() => { load(); }, [load]);

  const addGuest = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      await api.addWeddingGuest(event.id, {
        name: draft.name.trim(),
        partyLabel: draft.partyLabel.trim() || undefined,
        maxPartySize: Math.max(1, parseInt(draft.maxPartySize) || 1),
      }, token);
      setDraft({ name:"", partyLabel:"", maxPartySize:"1" });
      setShowAdd(false);
      load();
    } catch (e) {
      notify?.(e.message || "Failed to add guest", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeGuest = async (g) => {
    if (!window.confirm(`Remove ${g.name} from the guest list? Their invite link will stop working.`)) return;
    try {
      await api.deleteWeddingGuest(event.id, g.id, token);
      setGuests(gs => gs.filter(x => x.id !== g.id));
    } catch (e) {
      notify?.(e.message || "Failed to remove guest", "error");
    }
  };

  const copyLink = (g) => {
    const url = `${window.location.origin}/rsvp/${event.id}/${g.code}`;
    navigator.clipboard?.writeText(url);
    setCopiedId(g.id);
    notify?.("Invite link copied");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = guests.filter(g => {
    if (statusFilter !== "all" && g.rsvpStatus !== statusFilter) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase()) && !(g.partyLabel||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const attending = guests.filter(g => g.rsvpStatus === "attending");
  const headcount = attending.reduce((sum, g) => sum + (g.attendingCount || 1), 0);
  const pending = guests.filter(g => g.rsvpStatus === "pending").length;
  const declined = guests.filter(g => g.rsvpStatus === "declined").length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: mobile ? "16px" : "32px 24px" }}>
      <button onClick={onBack} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:13,marginBottom:16 }}>
        <ChevronLeft size={15}/>Back to {event.title}
      </button>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 className="outfit" style={{ fontSize:26, fontWeight:800, color:T.text, display:"flex", alignItems:"center", gap:10 }}>
            <Heart size={22} style={{ color:"#ec4899" }}/> Guest List
          </h1>
          <p style={{ color:T.muted, fontSize:13, marginTop:4 }}>{guests.length} invited · share each guest's personal link to send invites</p>
        </div>
        <Btn sz="sm" onClick={()=>setShowAdd(s=>!s)}><Plus size={14}/>Add Guest</Btn>
      </div>

      <div className="g3" style={{ marginBottom:24 }}>
        <StatCard label="Confirmed Headcount" value={headcount} icon={Users} color={T.success} sub={`${attending.length} ${attending.length===1?"invite":"invites"} attending`} />
        <StatCard label="Awaiting Reply" value={pending} icon={Clock} color={T.gold} />
        <StatCard label="Declined" value={declined} icon={XCircle} color={T.danger} />
      </div>

      {showAdd && (
        <Card style={{ padding:20, marginBottom:20 }}>
          <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
            <div style={{ flex:"2 1 180px" }}><Inp label="Guest / Family Name" value={draft.name} onChange={v=>setDraft(d=>({...d,name:v}))} placeholder="Jordan Family"/></div>
            <div style={{ flex:"2 1 160px" }}><Inp label="Label (optional)" value={draft.partyLabel} onChange={v=>setDraft(d=>({...d,partyLabel:v}))} placeholder="Bride's side"/></div>
            <div style={{ flex:"1 1 100px" }}><Inp label="Party Size" type="number" value={draft.maxPartySize} onChange={v=>setDraft(d=>({...d,maxPartySize:v}))}/></div>
            <Btn sz="md" onClick={addGuest} disabled={saving}>{saving?"Adding…":"Add"}</Btn>
          </div>
        </Card>
      )}

      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 200px" }}>
          <Inp label="" value={search} onChange={setSearch} placeholder="Search guests…"/>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["all","pending","attending","maybe","declined"].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              style={{ padding:"6px 12px", borderRadius:100, fontSize:12, fontWeight:700, cursor:"pointer",
                border:`1px solid ${statusFilter===s?T.accent:T.border}`,
                background:statusFilter===s?T.accent+"20":"transparent",
                color:statusFilter===s?T.accentL:T.muted, textTransform:"capitalize" }}>{s}</button>
          ))}
        </div>
      </div>

      {loading && <Card style={{ padding:40, textAlign:"center" }}><p style={{ color:T.muted }}>Loading…</p></Card>}

      {!loading && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(g => {
            const meta = STATUS_META[g.rsvpStatus] || STATUS_META.pending;
            return (
              <Card key={g.id} style={{ padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                  <div style={{ flex:1, minWidth:180 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:T.text }}>{g.name}</p>
                      <Bdg color={meta.color}><meta.Icon size={11}/>{meta.label}</Bdg>
                      {g.rsvpStatus==="attending" && <span style={{ fontSize:11, color:T.muted }}>· {g.attendingCount||1} of {g.maxPartySize}</span>}
                    </div>
                    <p style={{ fontSize:11.5, color:T.muted }}>
                      {g.partyLabel ? `${g.partyLabel} · ` : ""}Party of up to {g.maxPartySize}
                    </p>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <Btn sz="sm" v="secondary" onClick={()=>copyLink(g)}>
                      {copiedId===g.id ? <CheckCircle size={13}/> : <Copy size={13}/>} {copiedId===g.id?"Copied":"Copy Link"}
                    </Btn>
                    <button onClick={()=>removeGuest(g)} style={{ background:"none", border:"none", color:T.danger, cursor:"pointer", padding:"0 4px" }}><Trash2 size={14}/></button>
                  </div>
                </div>
                {g.rsvpData && Object.keys(g.rsvpData).length > 0 && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}`, display:"flex", flexWrap:"wrap", gap:8 }}>
                    {Object.entries(g.rsvpData).filter(([,v])=>v).map(([k,v])=>(
                      <span key={k} style={{ fontSize:11, color:T.muted, background:T.surface, padding:"3px 8px", borderRadius:100 }}>{String(v)}</span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card style={{ padding:40, textAlign:"center" }}>
              <p style={{ color:T.muted, fontSize:13 }}>{guests.length===0 ? "No guests added yet — add your first one above." : "No guests match your search/filter."}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
