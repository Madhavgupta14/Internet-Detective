// Shared helpers for Spectra's serverless endpoints:
// Google access-token verification + Vercel KV (Upstash REST) credit counter.

export const FREE_HUNTER_LIMIT = 2;

export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : "";
}

// Verifies a Google OAuth access token and returns { sub, email } or null.
export async function verifyGoogleToken(token) {
  if (!token) return null;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.sub) return null;

    const expectedAud = process.env.GOOGLE_CLIENT_ID;
    if (expectedAud && data.aud && data.aud !== expectedAud) return null;

    return { sub: data.sub, email: data.email || "" };
  } catch {
    return null;
  }
}

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvCommand(pathSegments) {
  const base = process.env.KV_REST_API_URL.replace(/\/+$/, "");
  const url = `${base}/${pathSegments.map(encodeURIComponent).join("/")}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
  });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  const data = await res.json();
  return data.result;
}

export async function getHunterUsed(sub) {
  if (!kvConfigured()) throw new Error("KV is not configured.");
  const raw = await kvCommand(["get", `hunter:${sub}`]);
  const used = parseInt(raw, 10);
  return Number.isFinite(used) ? used : 0;
}

export async function incrHunterUsed(sub) {
  if (!kvConfigured()) throw new Error("KV is not configured.");
  const result = await kvCommand(["incr", `hunter:${sub}`]);
  const used = parseInt(result, 10);
  return Number.isFinite(used) ? used : 1;
}
