export const KEYS = {
  ORGS:"ev-organizers", EVENTS:"ev-events",
  SCANNED:"ev-scanned", LOGS:"ev-scan-logs", BLASTS:"ev-email-blasts"
};
export function storGet(key,fallback){
  try{ const r=localStorage.getItem(key); return r?JSON.parse(r):fallback; }catch{return fallback;}
}
export function storSet(key,data){
  try{ localStorage.setItem(key,JSON.stringify(data)); }catch{}
}
