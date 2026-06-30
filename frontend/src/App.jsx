import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { T, EVENT_BANNERS } from "./styles/theme.js";
import StyleInjector from "./styles/StyleInjector.jsx";
import { genId } from "./utils/crypto.js";
import { DEFAULT_EVENTS, DEFAULT_ORGS } from "./data/seedData.js";
import * as db from "./utils/db.js";
import { sendEmail } from "./utils/email.js";
import { KEYS, storGet, storSet } from "./utils/storage.js";
import { api } from "./utils/api.js";

import { Btn, Card, Bdg, Toast } from "./components/ui/index.jsx";
import PublicHeader from "./components/PublicHeader.jsx";
import PublicFooter from "./components/PublicFooter.jsx";
import AppNav from "./components/AppNav.jsx";

import Landing from './pages/Landing.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Explore from "./pages/Explore.jsx";
import PublicEventPage from "./pages/PublicEventPage.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

import AdminDash from "./pages/admin/AdminDash.jsx";
import AdminRevenue from "./pages/admin/AdminRevenue.jsx";
import AdminScanLogView from "./pages/admin/AdminScanLogView.jsx";
import AdminOrgs from "./pages/admin/AdminOrgs.jsx";
import EmailBlast from "./pages/admin/EmailBlast.jsx";
import WhatsAppBlast from "./pages/admin/WhatsAppBlast.jsx";

import OrgDashboard from "./pages/organizer/OrgDashboard.jsx";
import CreateEvent from "./pages/organizer/CreateEvent.jsx";
import EventDetail from "./pages/organizer/EventDetail.jsx";
import RevenueDashboard from "./pages/organizer/RevenueDashboard.jsx";
import ScanLog from "./pages/organizer/ScanLog.jsx";
import TeamManagement from "./pages/organizer/TeamManagement.jsx";
import Scanner from "./pages/organizer/Scanner.jsx";
import SponsorBlast from "./pages/organizer/SponsorBlast.jsx";
import LiveDashboard from "./pages/organizer/LiveDashboard.jsx";
import AccountSettings from "./pages/organizer/AccountSettings.jsx";
import PaymentSettings from "./pages/organizer/PaymentSettings.jsx";

export default function App() {
  const [loading, setLoading]           = useState(true);
  const [organizers, setOrgs]           = useState([]);
  const [events, setEvents]             = useState([]);
  const [scanned, setScanned]           = useState({});
  const [scanLogs, setScanLogs]         = useState([]);
  const [view, setView]                 = useState(() => storGet(KEYS.VIEW, "landing"));
  const [evParam, setEvParam]           = useState(null);
  const [user, setUser]                 = useState(() => storGet(KEYS.USER, null));
  const [toasts, setToasts]             = useState([]);
  const [offline, setOffline]           = useState(false);
  const [registerError, setRegisterError]   = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [forgotLoading, setForgotLoading]     = useState(false);
  const [forgotTarget, setForgotTarget]       = useState(null);

  // ── Load from Supabase on mount ───────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await db.seedIfEmpty(DEFAULT_ORGS, DEFAULT_EVENTS);
        const [orgs, evs, logs] = await Promise.all([
          db.loadOrganizers(),
          db.loadEvents(),
          db.loadScanLogs(),
        ]);
        setOrgs(orgs);
        setEvents(evs);
        setScanLogs(logs);
        setScanned(storGet(KEYS.SCANNED, {}));
      } catch (e) {
        console.error("Supabase load failed, falling back to localStorage", e);
        setOrgs(storGet(KEYS.ORGS, DEFAULT_ORGS));
        setEvents(storGet(KEYS.EVENTS, DEFAULT_EVENTS));
        setScanLogs(storGet(KEYS.LOGS, []));
        setScanned(storGet(KEYS.SCANNED, {}));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── Persist session to survive refresh ───────────────────
  useEffect(() => { storSet(KEYS.USER, user); }, [user]);
  useEffect(() => { storSet(KEYS.VIEW, view); }, [view]);
  useEffect(() => { storSet(KEYS.SCANNED, scanned); }, [scanned]);

  // ── Land on verify-email if the URL carries a token (emailed link) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "verify-email" && params.get("token")) {
      setView("verify-email");
      setEvParam({ token: params.get("token") });
      // Clean the token out of the address bar.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── Helpers ───────────────────────────────────────────────
  const notify = useCallback((msg, type = "success") => {
    const id = genId("T");
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  const removeToast = id => setToasts(t => t.filter(x => x.id !== id));
  const nav = useCallback((v, param = null) => { setView(v); setEvParam(param); }, []);
  const logout = () => { setUser(null); setView("landing"); storSet(KEYS.USER, null); storSet(KEYS.VIEW, "landing"); storSet(KEYS.TOKEN, null); };
  const getOrg = useCallback(u => organizers.find(o => o.id === (u?.id || u?.orgId)), [organizers]);

  // ── Registration with email verify ────────────────────────
  // Password is collected up-front (Register.jsx step 2) and sent to the
  // backend in this same call, which hashes it and stores the user before
  // ever emailing a verification link — so the account's password is set
  // before the link is generated, not after.
  const handleRegister = async (data) => {
    setRegisterError("");
    setRegisterLoading(true);
    try {
      await api.register({
        name: data.accountType === "organisation" ? data.name : data.contactName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        accountType: data.accountType,
        expectedGuests: data.teamSize,
      });
    } catch (e) {
      if (e.status === 409) {
        setRegisterError("email_exists");
      } else {
        setRegisterError("Registration failed: " + (e.message || "Please try again."));
      }
      setRegisterLoading(false);
      return;
    }
    setRegisterLoading(false);
    notify("Application submitted! Check your email to verify your address.", "info");
    nav("verify-email", { email: data.email });
  };

  // ── Forgot password ───────────────────────────────────────
  const handleForgotSend = async (email, onSent) => {
    setForgotLoading(true);
    const org = organizers.find(o => o.email === email);
    if (!org) {
      notify("If that email is registered, a reset code has been sent.", "info");
      setForgotLoading(false);
      onSent?.();
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setForgotTarget({ email, orgId: org.id, code });
    try {
      await db.saveOrganizer({ ...org, verifyCode: code, verifyExpiry: Date.now() + 30 * 60 * 1000 });
      setOrgs(os => os.map(o => o.id === org.id ? { ...o, verifyCode: code, verifyExpiry: Date.now() + 30 * 60 * 1000 } : o));
    } catch (e) { console.error("save reset code failed", e); }
    try {
      await sendEmail({
        to: email,
        toName: org.contactName || org.name,
        subject: "Evenova Password Reset Code",
        htmlBody: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="font-size:22px;font-weight:800;margin-bottom:8px;">Reset your password</h2>
          <p style="color:#64748b;margin-bottom:24px;">Hi ${org.contactName || org.name}, use this code to reset your Evenova password:</p>
          <div style="background:#f1f5f9;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
            <p style="font-size:42px;font-weight:900;letter-spacing:12px;color:#1e293b;font-family:monospace;margin:0;">${code}</p>
          </div>
          <p style="color:#94a3b8;font-size:13px;">This code expires in 30 minutes. If you didn't request this, ignore this email.</p>
        </div>`,
        fromName: "Evenova",
        fromEmail: "hello.evenova@gmail.com",
      });
    } catch {
      console.log(`[Evenova] Password reset code for ${email}: ${code}`);
    }
    setForgotLoading(false);
    onSent?.();
    notify("Reset code sent! Check your email.", "info");
  };

  const handleForgotVerify = async (email, code, newPassword) => {
    setForgotLoading(true);
    const org = organizers.find(o => o.email === email);
    if (!org) { notify("Account not found.", "error"); setForgotLoading(false); return; }
    const storedCode = forgotTarget?.code || org.verifyCode;
    const expiry     = org.verifyExpiry;
    if (!storedCode || storedCode !== code) { notify("Incorrect code. Try again.", "error"); setForgotLoading(false); return; }
    if (expiry && Date.now() > expiry) { notify("Code expired. Please request a new one.", "error"); setForgotLoading(false); return; }
    const updated = { ...org, password: newPassword, verifyCode: null, verifyExpiry: null };
    try {
      await db.saveOrganizer(updated);
      setOrgs(os => os.map(o => o.id === org.id ? updated : o));
      setForgotTarget(null);
      notify("Password reset! You can now log in.");
      nav("login");
    } catch (e) {
      notify("Failed to update password: " + e.message, "error");
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Account settings update ───────────────────────────────
  const handleAccountUpdate = async (updates) => {
    const activeOrg = organizers.find(o => o.id === user?.id);
    if (!activeOrg) throw new Error("Organization not found");
    const updated = { ...activeOrg, ...updates };
    await db.saveOrganizer(updated);
    setOrgs(os => os.map(o => o.id === updated.id ? updated : o));
  };

  // ── Bank payment approve / reject ─────────────────────────
  const handleApprovePayment = useCallback(async (eventId, ticketId) => {
    setEvents(evs => evs.map(ev => {
      if (ev.id !== eventId) return ev;
      const updatedTickets = ev.tickets.map(t =>
        t.id !== ticketId ? t : { ...t, status: "unused", paymentStatus: "paid" }
      );
      const updated = { ...ev, tickets: updatedTickets };
      db.saveEvent(updated).catch(console.error);
      return updated;
    }));
    notify("Payment approved — ticket issued and will be emailed!");
  }, [notify]);

  const handleRejectPayment = useCallback(async (eventId, ticketId) => {
    setEvents(evs => evs.map(ev => {
      if (ev.id !== eventId) return ev;
      const updatedTickets = ev.tickets.map(t =>
        t.id !== ticketId ? t : { ...t, status: "rejected", paymentStatus: "rejected" }
      );
      const updated = { ...ev, tickets: updatedTickets };
      db.saveEvent(updated).catch(console.error);
      return updated;
    }));
    notify("Payment rejected.", "error");
  }, [notify]);

  const handleLogin = u => {
    setUser(u);
    // Expose payment config globally so PublicEventPage can read it.
    // (organizers array is still loaded from Supabase for public/event data —
    // only auth itself now comes from the API.)
    const org = organizers.find(o => o.id === u?.orgId);
    if (org?.paymentConfig) window._evPayCfg = org.paymentConfig;
    nav(u.role === "admin" ? "admin" : u.role === "staff" ? "scanner" : "dashboard");
    notify(`Welcome back, ${u.name || u.email}!`);
  };

  const approveOrg = id => {
    setOrgs(o => o.map(x => {
      if (x.id !== id) return x;
      const updated = { ...x, status: "approved" };
      db.saveOrganizer(updated).catch(console.error);
      return updated;
    }));
    notify("Organizer approved!");
  };

  const rejectOrg = id => {
    setOrgs(o => o.map(x => {
      if (x.id !== id) return x;
      const updated = { ...x, status: "rejected" };
      db.saveOrganizer(updated).catch(console.error);
      return updated;
    }));
    notify("Organizer rejected", "error");
  };

  const createEvent = ev => {
    setEvents(e => [...e, ev]);
    db.saveEvent(ev).catch(console.error);
    notify(`Event created with ${ev.tickets.length} signed tickets!`);
    nav("dashboard");
  };

  const addStaff = (orgId, m) => {
    setOrgs(o => o.map(x => {
      if (x.id !== orgId) return x;
      const updated = { ...x, staff: [...x.staff, m] };
      db.saveOrganizer(updated).catch(console.error);
      return updated;
    }));
    notify("Staff account created");
  };

  const removeStaff = (orgId, sid) => {
    setOrgs(o => o.map(x => {
      if (x.id !== orgId) return x;
      const updated = { ...x, staff: x.staff.filter(s => s.id !== sid) };
      db.saveOrganizer(updated).catch(console.error);
      return updated;
    }));
    notify("Staff removed", "error");
  };

  const handleScan = useCallback((ticket, status, reason, gateId, gate, ev, scanUser) => {
    if (!ev) return;
    const log = {
      id: genId("LOG"), ts: Date.now(), evId: ev.id, evTitle: ev.title,
      ticketId: ticket?.id || "", holderName: ticket?.holderName || "",
      gateId, gateName: gate?.name || gateId,
      staffId: scanUser?.id || "", staffName: scanUser?.name || "",
      ticketTypeName: ticket ? ev.ticketTypes[ticket.tpId]?.name || "" : "",
      status, reason: reason || "",
    };
    setScanLogs(l => [...l, log]);
    db.insertScanLog(log).catch(console.error);

    if (status === "admitted" && ticket) {
      const key = `${ev.id}:${ticket.id}`;
      setScanned(s => ({ ...s, [key]: true }));
      setEvents(evs => evs.map(e => {
        if (e.id !== ev.id) return e;
        const updated = {
          ...e,
          checkinCount: e.checkinCount + 1,
          tickets: e.tickets.map(t => t.id === ticket.id ? { ...t, status: "used" } : t),
        };
        db.saveEvent(updated).catch(console.error);
        return updated;
      }));
    }
  }, []);

  const org = user ? getOrg(user) : null;
  const ev  = events.find(e => e.id === evParam);

  const PUBLIC_VIEWS = ["landing","explore","about","contact","how-it-works","public-event","register","login","verify-email","forgot-password"];
  const isPublic = !user || PUBLIC_VIEWS.includes(view);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div className="spin" style={{ width:40, height:40, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:"50%", margin:"0 auto 16px" }}/>
        <p style={{ color:T.muted, fontSize:14 }}>Loading Evenova…</p>
      </div>
    </div>
  );

  const renderScreen = () => {
    if (view === "verify-email") return (
      <VerifyEmail email={evParam?.email || ""} token={evParam?.token || null} onNav={nav} />
    );
    if (view === "public-event" && ev) return (
      <PublicEventPage event={ev} onBack={() => nav("explore")}
        onRegister={(evId, reg, ticket) => {
          const tkt = ticket || {
            id: reg.tId, evId, uId: reg.uId, gId: Object.keys(ev.gates)[0],
            tpId: Object.keys(ev.ticketTypes)[1] || Object.keys(ev.ticketTypes)[0],
            code: reg.code, holderName: reg.holderName, holderEmail: reg.holderEmail,
            holderPhone: "", status: "unused", customData: reg.data,
            registeredAt: new Date().toISOString(),
          };
          setEvents(evs => evs.map(e => {
            if (e.id !== evId) return e;
            const updated = { ...e, tickets: [...e.tickets, tkt] };
            db.saveEvent(updated).catch(console.error);
            return updated;
          }));
        }} notify={notify} />
    );
    if (view === "register") return <Register onSubmit={handleRegister} onNav={v=>{setRegisterError("");nav(v);}} error={registerError} loading={registerLoading}/>;
    if (view === "login")    return <Login onLogin={handleLogin} onNav={nav} />;
    if (view === "forgot-password") return <ForgotPassword onSendCode={handleForgotSend} onVerifyReset={handleForgotVerify} onResendCode={(em,cb)=>handleForgotSend(em,cb)} onBack={()=>nav("login")} loading={forgotLoading}/>;
    if (view === "how-it-works") return <HowItWorks onNav={nav} />;
    if (view === "about")    return <About onNav={nav} />;
    if (view === "contact")  return <Contact notify={notify} />;
    if (view === "explore")  return <Explore events={events} onEventPage={id => nav("public-event", id)} />;

    if (!user || view === "landing")
      return <Landing events={events} onNav={nav} onEventPage={id => nav("public-event", id)} />;

    // ── Admin ─────────────────────────────────────────────
    if (user.role === "admin") {
      if (view === "admin-orgs")     return <AdminOrgs organizers={organizers} onApprove={approveOrg} onReject={rejectOrg} />;
      if (view === "admin-revenue")  return <AdminRevenue organizers={organizers} events={events} />;
      if (view === "admin-scan-log") return <AdminScanLogView scanLogs={scanLogs} events={events} organizers={organizers} />;
      if (view === "email-blast")     return <EmailBlast org={null} events={events} user={user} notify={notify} />;
      if (view === "whatsapp-blast")  return <WhatsAppBlast user={user} notify={notify} />;
      if (view === "sponsor-blast")   return <SponsorBlast org={null} user={user} notify={notify} />;
      if (view === "admin-events")   return (
        <div style={{ maxWidth:1000, margin:"0 auto", padding:32 }}>
          <h1 className="outfit" style={{ fontSize:26, fontWeight:800, color:T.text, marginBottom:24 }}>All Events</h1>
          {events.map(ev2 => (
            <Card key={ev2.id} style={{ padding:20, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div>
                  <p style={{ fontWeight:700, color:T.text }}>{ev2.title}</p>
                  <p style={{ fontSize:12, color:T.muted }}>{ev2.date} · {ev2.venue} · {ev2.tickets.length} tickets</p>
                </div>
                <Bdg color="purple">{ev2.category}</Bdg>
              </div>
            </Card>
          ))}
        </div>
      );
      return <AdminDash organizers={organizers} events={events} scanLogs={scanLogs} onNav={nav} />;
    }

    // ── Organizer & Staff ─────────────────────────────────
    const activeOrg = org || organizers.find(o => o.id === user?.orgId);
    if (!activeOrg) return (
      <div style={{ padding:40, textAlign:"center", color:T.muted }}>Organization not found.</div>
    );

    if (user.role === "staff") {
      if (view === "live") return <LiveDashboard events={events} orgId={activeOrg.id} />;
      return <Scanner events={events} scanned={scanned} offlineMode={offline}
        onToggleOffline={() => setOffline(o => !o)} onScan={handleScan}
        onCacheDownload={() => notify("Cache downloaded", "info")}
        orgId={activeOrg.id} user={user} />;
    }

    const screens = {
      dashboard: <OrgDashboard org={activeOrg} events={events} onNav={nav} notify={notify} />,
      events: (
        <div style={{ maxWidth:1200, margin:"0 auto", padding:32 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
            <h1 className="outfit" style={{ fontSize:26, fontWeight:800, color:T.text }}>Events</h1>
            <Btn onClick={() => nav("create-event")} icon={<span>+</span>}>Create Event</Btn>
          </div>
          <div className="ga">
            {events.filter(e => e.orgId === activeOrg.id).map(ev2 => (
              <Card key={ev2.id} hover style={{ overflow:"hidden" }} onClick={() => nav("event-detail", ev2.id)}>
                <div style={{ height:120, background:EVENT_BANNERS[ev2.banner] || EVENT_BANNERS[0] }} />
                <div style={{ padding:18 }}>
                  <Bdg color="purple">{ev2.category}</Bdg>
                  <p style={{ fontSize:14, fontWeight:700, color:T.text, margin:"8px 0 4px" }}>{ev2.title}</p>
                  <p style={{ fontSize:12, color:T.muted }}>{ev2.date} · {Object.keys(ev2.gates).length} gates · {Object.keys(ev2.ticketTypes).length} tiers</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ),
      "create-event": <CreateEvent org={activeOrg} onSubmit={createEvent} onBack={() => nav("events")} />,
      "event-detail": ev ? <EventDetail
        event={ev}
        onBack={() => nav("events")}
        onNav={nav}
        notify={notify}
        onApprovePayment={handleApprovePayment}
        onRejectPayment={handleRejectPayment}
        onAddTicket={(evId, ticket) => setEvents(evs => evs.map(e => {
          if (e.id !== evId) return e;
          const updated = { ...e, tickets: [...e.tickets, ticket] };
          db.saveEvent(updated).catch(console.error);
          return updated;
        }))}
      /> : null,
      team:          <TeamManagement org={activeOrg} events={events} onAddStaff={m => addStaff(activeOrg.id, m)} onRemoveStaff={sid => removeStaff(activeOrg.id, sid)} scanLogs={scanLogs} />,
      scanner:       <Scanner events={events} scanned={scanned} offlineMode={offline} onToggleOffline={() => setOffline(o => !o)} onScan={handleScan} onCacheDownload={() => notify("Cache downloaded", "info")} orgId={activeOrg.id} user={user} />,
      live:          <LiveDashboard events={events} orgId={activeOrg.id} />,
      revenue:       <RevenueDashboard events={events} orgId={activeOrg.id} />,
      "scan-log":    <ScanLog scanLogs={scanLogs} events={events} orgId={activeOrg.id} />,
      "sponsor-blast": <SponsorBlast org={activeOrg} user={user} notify={notify} />,
      "account-settings": <AccountSettings org={activeOrg} onSave={handleAccountUpdate} notify={notify}/>,
      "payment-settings": <PaymentSettings org={activeOrg} onSave={handleAccountUpdate} notify={notify}/>,
    };
    return screens[view] || screens.dashboard;
  };

  const showPublicChrome = isPublic && view !== "verify-email";

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text }}>
      <StyleInjector />
      <Toast items={toasts} onClose={removeToast} />
      {showPublicChrome && <PublicHeader view={view} onNav={nav} />}
      {user && !isPublic && <AppNav user={user} onNav={nav} onLogout={logout} />}
      <div style={{ minHeight:"calc(100vh - 58px)" }}>
        <AnimatePresence mode="wait" initial={false}>
          <div key={view}>
            {renderScreen()}
          </div>
        </AnimatePresence>
      </div>
      {showPublicChrome && ["landing","about","contact","explore","how-it-works"].includes(view) && (
        <PublicFooter onNav={nav} />
      )}
    </div>
  );
}