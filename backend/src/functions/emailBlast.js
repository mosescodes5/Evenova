const AWS = require("aws-sdk");
const ses = new AWS.SES({ region: "eu-west-1" });
exports.handler = async (event) => {
  const { to, toName, subject, htmlBody, fromName, fromEmail } = JSON.parse(event.body||"{}");
  await ses.sendEmail({
    Source: fromName+" <"+fromEmail+">",
    Destination: { ToAddresses:[to] },
    Message:{ Subject:{Data:subject}, Body:{Html:{Data:htmlBody}} }
  }).promise();
  return { statusCode:200, headers:{"Access-Control-Allow-Origin":"*"}, body:JSON.stringify({ok:true}) };
};`}</pre>
                  <button onClick={() => { navigator.clipboard?.writeText("// See Evenova Email Blast Settings for full template"); notify("Copied!"); }}
                    style={{ position: "absolute", top: 8, right: 8, padding: "3px 8px", borderRadius: 6, background: T.card, border: `1px solid ${T.border}`, color: T.muted, fontSize: 11, cursor: "pointer" }}>
                    <Copy size={10} /> Copy
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* ── Payment Provider ── */}
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: T.gold+"20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <DollarSign size={16} style={{ color: T.gold }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Payment Provider</h3>
                  <p style={{ fontSize: 11, color: T.muted }}>Collect ticket payments online or allow offline payment.</p>
                </div>
              </div>
              <Btn sz="sm" v="gold" onClick={savePayConfig}>Save</Btn>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {[["none","🔓 No Payment (Free)"],["bank","🏦 Bank Transfer"],["paystack","💳 Paystack"],["flutterwave","🦋 Flutterwave"]].map(([id,label]) => (
                <button key={id} onClick={() => setPayProvider(id)}
                  style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${payProvider===id ? T.gold : T.border}`,
                    background: payProvider===id ? T.gold+"20" : "transparent",
                    color: payProvider===id ? T.gold : T.muted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>

            {payProvider === "none" && (
              <div style={{ padding: 12, borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, fontSize: 12, color: T.muted }}>
                Attendees register for free with no payment step. Use <b>Manual Ticket</b> in Event Detail to issue tickets to offline payers.
              </div>
            )}

            {payProvider === "bank" && (
              <div style={{ padding: 14, borderRadius: 10, background: T.gold+"10", border: `1px solid ${T.gold+"30"}` }}>
                <p style={{ fontSize: 12, color: T.gold, fontWeight: 700, marginBottom: 6 }}>Bank Transfer Mode</p>
                <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.7 }}>
                  Attendees register and see your bank details. After payment confirmation, use <b>Issue Manual Ticket</b> in Event Detail to generate and email their QR ticket.
                  <br/><br/>Update your bank details in Event Detail → Manual Ticket modal.
                </p>
              </div>
            )}

            {payProvider === "paystack" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 12, borderRadius: 10, background: T.success+"10", border: `1px solid ${T.success+"30"}` }}>
                  <p style={{ fontSize: 11, color: T.muted }}>1. Go to paystack.com → Settings → API Keys & Webhooks<br/>2. Copy your <b>Public Key</b> (starts with pk_live_ or pk_test_)<br/>3. Paste it below. The checkout popup opens in-page — no redirect.</p>
                </div>
                <Inp label="Paystack Public Key" value={paystackKey} onChange={setPaystackKey} placeholder="pk_live_xxxxxxxxxxxx or pk_test_xxxxxxxxxxxx" />
                {paystackKey && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: T.success+"10", border: `1px solid ${T.success+"30"}` }}>
                  <CheckCircle size={13} style={{ color: T.success }} /><span style={{ fontSize: 12, color: T.success, fontWeight: 700 }}>Paystack key configured · Tickets issued after payment</span>
                </div>}
              </div>
            )}

            {payProvider === "flutterwave" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 12, borderRadius: 10, background: T.warn+"10", border: `1px solid ${T.warn+"30"}` }}>
                  <p style={{ fontSize: 11, color: T.muted }}>1. Go to app.flutterwave.com → Settings → API Keys<br/>2. Copy your <b>Public Key</b> (starts with FLWPUBK)<br/>3. Paste it below.</p>
                </div>
                <Inp label="Flutterwave Public Key" value={flwKey} onChange={setFlwKey} placeholder="FLWPUBK-xxxxxxxxxxxx-X" />
                {flwKey && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: T.success+"10", border: `1px solid ${T.success+"30"}` }}>
                  <CheckCircle size={13} style={{ color: T.success }} /><span style={{ fontSize: 12, color: T.success, fontWeight: 700 }}>Flutterwave key configured · Tickets issued after payment</span>
                </div>}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════ PREVIEW MODAL ════════════════ */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Email Preview" width={700}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: T.surface, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", marginBottom: 2 }}>From</p>
              <p style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{senderName} &lt;{senderEmail}&gt;</p>
            </div>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, flex: 1 }}>
              <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", marginBottom: 2 }}>Subject</p>
              <p style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{subject || "(no subject)"}</p>
            </div>
          </div>
          <div style={{ padding: "4px 14px", borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 12 }}>
            <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", padding: "8px 0 4px" }}>To ({emails.length})</p>
            <p style={{ fontSize: 12, color: T.muted, paddingBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {emails.slice(0, 5).map(e => e.name || e.email).join(", ")}{emails.length > 5 ? ` + ${emails.length - 5} more` : ""}
            </p>
          </div>
        </div>

        {/* Rendered preview */}
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: T.surface, borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.muted }}>
            📧 Rendered for: {emails[0]?.name || "Sample Recipient"} &lt;{emails[0]?.email || "sample@example.com"}&gt;
          </div>
          <div style={{ padding: 24, background: "#fff", minHeight: 200, color: "#1a1a1a" }}>
            <div dangerouslySetInnerHTML={{ __html: getBody().replace(/{name}/g, emails[0]?.name || "Friend").replace(/{email}/g, emails[0]?.email || "") }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Btn v="secondary" full onClick={() => setShowPreview(false)}>Edit</Btn>
          <Btn full onClick={() => { setShowPreview(false); handleSend(); }} icon={<Send size={14} />}>
            Send to {emails.length} Recipient{emails.length !== 1 ? "s" : ""}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}


