import { useState } from "react";
import { Sparkles, CheckCircle, Users, Percent, Zap } from "lucide-react";
import { T } from "../styles/theme.js";
import { Btn, Card, Inp } from "../components/ui/index.jsx";
import { useMedia } from "../hooks/useMedia.js";
import { api } from "../utils/api.js";

export default function Waitlist({ notify }) {
  const { mobile } = useMedia();
  const [form, setForm] = useState({ name: "", email: "", phone: "", hostingPaidEvents: false });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { alreadyOnList, message }

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      notify?.("Please fill in your name and email", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.joinWaitlist(form);
      setDone(res);
    } catch (e) {
      notify?.(e.message || "Something went wrong — please try again", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const perks = [
    [Zap, "Early access", "Be first in when we open the doors — no queue."],
    [Percent, "5% off your service fee", "Hosting paid events? Waitlisters get a discount code for a reduced platform fee."],
    [Users, "Shape the product", "Early feedback goes straight to what we build next."],
  ];

  return (
    <div style={{ background: T.bg, paddingTop: 64, minHeight: "80vh" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: mobile ? "60px 16px" : "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 100, background: T.accent + "20", border: `1px solid ${T.accent}40`, marginBottom: 18 }}>
            <Sparkles size={13} style={{ color: T.accentL }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.accentL }}>Coming soon</span>
          </div>
          <h1 className="outfit" style={{ fontSize: mobile ? 34 : 48, fontWeight: 900, color: T.text, marginBottom: 12 }}>Join the Waitlist</h1>
          <p style={{ color: T.muted, fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
            Get early access to Evenova, and if you're planning to host paid events, we'll send you a discount code for a reduced service fee.
          </p>
        </div>

        <div className="g2" style={{ alignItems: "start" }}>
          <div>
            {perks.map(([Icon, title, sub], i) => (
              <Card key={i} style={{ padding: "18px 24px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accent + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={20} style={{ color: T.accentL }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{title}</p>
                    <p style={{ fontSize: 12.5, color: T.muted, marginTop: 4, lineHeight: 1.6 }}>{sub}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card style={{ padding: 32 }}>
            {done ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.success + "20", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <CheckCircle size={26} style={{ color: T.success }} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                  {done.alreadyOnList ? "You're already on the list!" : "You're on the list!"}
                </h3>
                <p style={{ fontSize: 13, color: T.muted }}>
                  {form.hostingPaidEvents ? "We'll email you a discount code before launch." : "We'll let you know as soon as we're ready."}
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 20 }}>Reserve your spot</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Inp label="Your Name" value={form.name} onChange={set("name")} required />
                  <Inp label="Email" type="email" value={form.email} onChange={set("email")} required />
                  <Inp label="Phone (optional)" value={form.phone} onChange={set("phone")} />
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: `1px solid ${form.hostingPaidEvents ? T.accent : T.border}`, background: form.hostingPaidEvents ? T.accent + "12" : "transparent" }}>
                    <input type="checkbox" checked={form.hostingPaidEvents} onChange={e => set("hostingPaidEvents")(e.target.checked)} style={{ marginTop: 3 }} />
                    <span style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
                      I'll be hosting <strong>paid</strong> events — send me a service-fee discount code.
                    </span>
                  </label>
                  <Btn full sz="lg" onClick={submit} disabled={submitting}>
                    {submitting ? "Joining…" : "Join the Waitlist"}
                  </Btn>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
