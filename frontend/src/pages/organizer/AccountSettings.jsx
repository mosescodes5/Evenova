import { useState } from "react";
import { Building, CheckCircle, KeyRound, Phone, Save, User } from "lucide-react";
import { GA, T } from "../../styles/theme.js";
import { Btn, Card, Inp } from "../../components/ui/index.jsx";
import { useMedia } from "../../hooks/useMedia.js";

function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <Card style={{ padding:24, marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:T.accent+"22", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon size={16} style={{ color:T.accent }}/>
        </div>
        <h3 style={{ fontSize:15, fontWeight:700, color:T.text }}>{title}</h3>
      </div>
      {children}
    </Card>
  );
}

export default function AccountSettings({ org, user, onSave, notify }) {
  const { mobile } = useMedia();

  // Profile state
  const [profile, setProfile] = useState({
    contactName: org.contactName || "",
    phone: org.phone || "",
    orgName: org.name || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password state
  const [pwForm, setPwForm] = useState({ current:"", next:"", confirm:"" });
  const [pwErr, setPwErr] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState({ current:false, next:false, confirm:false });
  const toggleShow = key => setShowPw(p => ({ ...p, [key]:!p[key] }));

  const setP = k => v => setProfile(p => ({ ...p, [k]:v }));

  const saveProfile = async () => {
    if (!profile.contactName.trim()) { notify("Full name is required", "error"); return; }
    if (!profile.orgName.trim()) { notify("Organization name is required", "error"); return; }
    setProfileSaving(true);
    try {
      await onSave({ contactName:profile.contactName.trim(), name:profile.orgName.trim(), phone:profile.phone.trim() });
      setProfileSaved(true);
      notify("Profile updated successfully!");
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e) {
      notify("Failed to save: " + e.message, "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async () => {
    setPwErr("");
    if (!pwForm.current) { setPwErr("Enter your current password."); return; }
    if (pwForm.current !== org.password) { setPwErr("Current password is incorrect."); return; }
    if (pwForm.next.length < 6) { setPwErr("New password must be at least 6 characters."); return; }
    if (pwForm.next === pwForm.current) { setPwErr("New password must be different from your current one."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwErr("New passwords don't match."); return; }
    setPwSaving(true);
    try {
      await onSave({ password: pwForm.next });
      notify("Password changed successfully!");
      setPwForm({ current:"", next:"", confirm:"" });
    } catch (e) {
      notify("Failed to update password: " + e.message, "error");
    } finally {
      setPwSaving(false);
    }
  };

  const PwField = ({ label, fkey, placeholder }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em" }}>{label}</label>
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
        <input
          type={showPw[fkey] ? "text" : "password"}
          value={pwForm[fkey]}
          onChange={e => setPwForm(p => ({ ...p, [fkey]:e.target.value }))}
          placeholder={placeholder}
          style={{ width:"100%", padding:"10px 44px 10px 14px", borderRadius:10, fontSize:14,
            color:T.text, background:T.surface, border:`1px solid ${T.border}`, fontFamily:"inherit", outline:"none" }}
          onFocus={e => e.target.style.borderColor = T.accent}
          onBlur={e => e.target.style.borderColor = T.border}
        />
        <button onClick={() => toggleShow(fkey)} style={{ position:"absolute", right:12, background:"none",
          border:"none", cursor:"pointer", color:showPw[fkey]?T.accentL:T.muted, display:"flex", alignItems:"center", padding:4 }}>
          <EyeIcon open={showPw[fkey]}/>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:mobile?"16px":"32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 className="outfit" style={{ fontSize:26, fontWeight:800, color:T.text, marginBottom:4 }}>Account Settings</h1>
        <p style={{ color:T.muted, fontSize:14 }}>{org.name} · {user?.email}</p>
      </div>

      {/* Profile section */}
      <Section icon={User} title="Profile Information">
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Inp label="Full Name" value={profile.contactName} onChange={setP("contactName")} required placeholder="Your full name"/>
          <Inp label="Phone Number" value={profile.phone} onChange={setP("phone")} placeholder="+234 801 234 5678"/>
          <Inp label="Organization Name" value={profile.orgName} onChange={setP("orgName")} required placeholder="Your company / brand name"/>

          {/* Read-only email */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".06em" }}>Email Address</label>
            <div style={{ padding:"10px 14px", borderRadius:10, fontSize:14, color:T.muted,
              background:T.surface+"80", border:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>{user?.email}</span>
              <span style={{ fontSize:11, padding:"2px 8px", borderRadius:100, background:T.info+"22", color:T.info, fontWeight:700 }}>Cannot change</span>
            </div>
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
            <Btn onClick={saveProfile} disabled={profileSaving} icon={profileSaved ? <CheckCircle size={14}/> : <Save size={14}/>}
              v={profileSaved ? "success" : "primary"}>
              {profileSaving ? "Saving…" : profileSaved ? "Saved!" : "Save Changes"}
            </Btn>
          </div>
        </div>
      </Section>

      {/* Organization section */}
      <Section icon={Building} title="Account Info">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            ["Account ID", org.id],
            ["Status", org.status],
            ["Team Size", `Up to ${org.teamSize} staff`],
            ["Staff Accounts", `${org.staff?.length || 0} created`],
          ].map(([label, value]) => (
            <div key={label} style={{ padding:"12px 14px", borderRadius:10, background:T.surface+"60", border:`1px solid ${T.border}` }}>
              <p style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{label}</p>
              <p style={{ fontSize:13, fontWeight:700, color:T.text, textTransform:"capitalize" }}>{value}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Change password section */}
      <Section icon={KeyRound} title="Change Password">
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <PwField label="Current Password" fkey="current" placeholder="Your current password"/>
          <PwField label="New Password" fkey="next" placeholder="Min 6 characters"/>
          <PwField label="Confirm New Password" fkey="confirm" placeholder="Same as above"/>

          {pwErr && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:T.danger+"15",
              border:`1px solid ${T.danger+"30"}`, fontSize:13, color:T.danger }}>
              {pwErr}
            </div>
          )}

          <div style={{ padding:12, borderRadius:10, background:T.warn+"12", border:`1px solid ${T.warn+"30"}`, fontSize:12, color:T.warn, lineHeight:1.6 }}>
            💡 Use at least 6 characters. Avoid reusing old passwords.
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <Btn onClick={savePassword} disabled={pwSaving} v="primary" icon={<KeyRound size={14}/>}>
              {pwSaving ? "Updating…" : "Update Password"}
            </Btn>
          </div>
        </div>
      </Section>
    </div>
  );
}