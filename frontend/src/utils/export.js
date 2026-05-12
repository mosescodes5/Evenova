/* ─────────────────────────────────────────────────────────────
   5. CSV EXPORT HELPERS
───────────────────────────────────────────────────────────── */
export function toCSV(rows) {
  return rows.map(r =>
    r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
}
export function downloadCSV(filename, rows) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
export function exportAttendees(event) {
  const hdr = ["Ticket ID", "Name", "Email", "Phone", "Ticket Type", "Gate", "Status", "Registered"];
  const rows = event.tickets.map(t => [
    t.id, t.holderName, t.holderEmail || "", t.holderPhone || "",
    event.ticketTypes[t.tpId]?.name || "",
    event.gates[t.gId]?.name || "",
    t.status === "used" ? "Checked In" : "Unused",
    t.registeredAt ? new Date(t.registeredAt).toLocaleString("en-NG") : "",
  ]);
  downloadCSV(`${event.title.replace(/[^a-z0-9]/gi, "_")}_attendees.csv`, [hdr, ...rows]);
}
export function exportScanLog(logs, eventTitle) {
  const hdr = ["#", "Time", "Attendee", "Gate", "Ticket Type", "Staff", "Status", "Reason"];
  const rows = logs.map((l, i) => [
    i + 1, new Date(l.ts).toLocaleString("en-NG"),
    l.holderName, l.gateName, l.ticketTypeName,
    l.staffName, l.status, l.reason || "",
  ]);
  downloadCSV(`${eventTitle.replace(/[^a-z0-9]/gi, "_")}_scan_log.csv`, [hdr, ...rows]);
}

