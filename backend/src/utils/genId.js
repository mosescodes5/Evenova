// backend/src/utils/genId.js
// Same format as frontend/src/utils/crypto.js's genId(), so IDs generated
// on either side look consistent in the flat Supabase tables.
export function genId(pfx = "ID") {
  return pfx + Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}
