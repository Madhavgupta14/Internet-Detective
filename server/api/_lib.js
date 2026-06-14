// Shared helpers for Spectra's serverless endpoints:
// Google access-token verification + Redis-backed per-account credit counter.
// Works with a Redis connection string (REDIS_URL / KV_URL) or an HTTP REST
// store (Vercel KV / Upstash REST), whichever the project has configured.

import { createClient } from "redis";

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

// --- Option A: Redis connection string (REDIS_URL / KV_URL) ---
function redisUrl() {
  return process.env.REDIS_URL || process.env.KV_URL || "";
}

let redisClientPromise = null;
async function getRedis() {
  if (!redisUrl()) return null;
  if (!redisClientPromise) {
    const client = createClient({ url: redisUrl() });
    client.on("error", () => {
      // Reset so a later call can reconnect.
      redisClientPromise = null;
    });
    redisClientPromise = client.connect().then(() => client);
  }
  return redisClientPromise;
}

// --- Option B: HTTP REST store (Vercel KV / Upstash REST) ---
function restUrl() {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
}

function restToken() {
  return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
}

function restConfigured() {
  return Boolean(restUrl() && restToken());
}

async function restCommand(pathSegments) {
  const base = restUrl().replace(/\/+$/, "");
  const url = `${base}/${pathSegments.map(encodeURIComponent).join("/")}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${restToken()}` } });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  const data = await res.json();
  return data.result;
}

export async function getHunterUsed(sub) {
  const key = `hunter:${sub}`;
  const client = await getRedis();
  if (client) {
    const raw = await client.get(key);
    const used = parseInt(raw, 10);
    return Number.isFinite(used) ? used : 0;
  }
  if (restConfigured()) {
    const raw = await restCommand(["get", key]);
    const used = parseInt(raw, 10);
    return Number.isFinite(used) ? used : 0;
  }
  throw new Error("No credit store configured.");
}

export async function incrHunterUsed(sub) {
  const key = `hunter:${sub}`;
  const client = await getRedis();
  if (client) {
    const used = await client.incr(key);
    return Number.isFinite(used) ? used : 1;
  }
  if (restConfigured()) {
    const result = await restCommand(["incr", key]);
    const used = parseInt(result, 10);
    return Number.isFinite(used) ? used : 1;
  }
  throw new Error("No credit store configured.");
}

// Best-effort caller IP from Vercel's forwarding headers.
export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"] || "";
  const first = (Array.isArray(xff) ? xff[0] : xff).split(",")[0].trim();
  return first || req.socket?.remoteAddress || "unknown";
}

// Best-effort sliding counter for `key` within `ttlSeconds`. Returns the
// current count, or 0 if no store is configured (fails open — never blocks
// legitimate traffic just because the store is down).
export async function rateHit(key, ttlSeconds) {
  try {
    const client = await getRedis();
    if (client) {
      const n = await client.incr(key);
      if (n === 1) await client.expire(key, ttlSeconds);
      return Number.isFinite(n) ? n : 0;
    }
    if (restConfigured()) {
      const n = parseInt(await restCommand(["incr", key]), 10) || 1;
      if (n === 1) await restCommand(["expire", key, String(ttlSeconds)]);
      return n;
    }
  } catch {
    // fail open
  }
  return 0;
}
