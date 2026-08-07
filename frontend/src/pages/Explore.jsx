import { useMemo, useState } from "react";
import { PageMotion, StaggerReveal, StaggerItem, HoverCard } from "../components/Motion.jsx";
import { Search } from "lucide-react";
import { EVENT_BANNERS, T } from "../styles/theme.js";
import { Bdg, Btn } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";

export default function Explore({ events, onEventPage }) {
  const { mobile } = useMedia();
  const [search, setSearch] = useState("");
  const [cat,    setCat]    = useState("All");
  const [sort,   setSort]   = useState("date");

  const cats = ["All", "Music", "Technology", "Food & Drinks", "Arts"];

  const filtered = useMemo(() => {
    let list = events.filter(e =>
      (!search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.venue.toLowerCase().includes(search.toLowerCase())
      ) &&
      (cat === "All" || e.category === cat)
    );
    if (sort === "date")  list = [...list].sort((a, b) => a.date.localeCompare(b.date));
    if (sort === "price") list = [...list].sort((a, b) =>
      Math.min(...Object.values(a.ticketTypes).map(t => t.price)) -
      Math.min(...Object.values(b.ticketTypes).map(t => t.price))
    );
    return list;
  }, [events, search, cat, sort]);

  return (
    <PageMotion>
      <div style={{ background: "#08080f", paddingTop: 64, minHeight: "100vh" }}>

        {/* ── Filter bar ── */}
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: mobile ? "24px 16px" : "32px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h1 className="outfit" style={{ fontSize: mobile ? 26 : 34, fontWeight: 800, color: T.text, marginBottom: 20 }}>
              All Events
            </h1>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {/* Search */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                flex: 1, minWidth: 200, padding: "10px 14px",
                borderRadius: 12, background: T.card, border: `1px solid ${T.border}`,
              }}>
                <Search size={15} style={{ color: T.muted }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search events…"
                  style={{ background: "none", border: "none", color: T.text, fontSize: 14, flex: 1, outline: "none" }}
                />
              </div>

              {/* Category */}
              <select
                value={cat}
                onChange={e => setCat(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}`, color: T.text, fontSize: 13 }}
              >
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>

              {/* Sort */}
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}`, color: T.text, fontSize: 13 }}
              >
                <option value="date">Sort: Date</option>
                <option value="price">Sort: Price</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "24px 16px" : "40px 24px" }}>
          <p style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
            {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
          </p>

          <StaggerReveal stagger={0.06} className="ga">
            {filtered.map(ev => {
              const minP  = Math.min(...Object.values(ev.ticketTypes).map(t => t.price));
              const hasEB = Object.values(ev.ticketTypes).some(t => t.name.toLowerCase().includes("early"));
              return (
                <StaggerItem key={ev.id}>
                  <HoverCard
                    onClick={() => onEventPage(ev.id)}
                    style={{
                      overflow: "hidden", borderRadius: 16,
                      background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ height: 150, background: EVENT_BANNERS[ev.banner] || EVENT_BANNERS.music }} />
                    <div style={{ padding: 20 }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                        <Bdg color="purple">{ev.category}</Bdg>
                        {hasEB && <Bdg color="green">🐦 Early Bird</Bdg>}
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6, lineHeight: 1.3 }}>{ev.title}</h3>
                      <p style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>{ev.date} · {ev.venue}</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: T.gold, marginBottom: 12 }}>From ₦{minP.toLocaleString()}</p>
                      <Btn full sz="sm">Get Tickets</Btn>
                    </div>
                  </HoverCard>
                </StaggerItem>
              );
            })}
          </StaggerReveal>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 60 }}>
              <p style={{ color: T.muted, fontSize: 16 }}>No events found. Try adjusting your search.</p>
            </div>
          )}
        </div>

      </div>
    </PageMotion>
  );
}