// Vercel serverless function: Hunter.io email-finder proxy for Spectra.
// Requires a signed-in Google account and enforces a per-account credit cap
// (stored in Vercel KV) so the shared Hunter key cannot be drained.

import { setCors, bearerToken, verifyGoogleToken, getHunterUsed, incrHunterUsed, FREE_HUNTER_LIMIT } from "./_lib.js";

const HUNTER_URL = "https://api.hunter.io/v2/email-finder";

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing HUNTER_API_KEY." });
    return;
  }

  const user = await verifyGoogleToken(bearerToken(req));
  if (!user) {
    res.status(401).json({ error: "Sign in with Google to use the email finder." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Request body must be valid JSON." });
      return;
    }
  }

  const domain = body && typeof body.domain === "string" ? body.domain.trim() : "";
  const company = body && typeof body.company === "string" ? body.company.trim() : "";
  const firstName = body && typeof body.first_name === "string" ? body.first_name.trim() : "";
  const lastName = body && typeof body.last_name === "string" ? body.last_name.trim() : "";

  if ((!domain && !company) || !firstName || !lastName) {
    res.status(400).json({ error: "Provide company (or domain), first_name, and last_name." });
    return;
  }

  // Per-account credit check.
  let used;
  try {
    used = await getHunterUsed(user.sub);
  } catch {
    res.status(500).json({ error: "Credit store unavailable. Try again shortly." });
    return;
  }

  if (used >= FREE_HUNTER_LIMIT) {
    res.status(403).json({
      error: `You've used all ${FREE_HUNTER_LIMIT} free verified lookups for this account.`,
      usesRemaining: 0,
      freeLimit: FREE_HUNTER_LIMIT
    });
    return;
  }

  // Prefer the company name — Hunter resolves it to the real corporate domain,
  // which is far more accurate than a domain guessed from the company string.
  const params = new URLSearchParams({ first_name: firstName, last_name: lastName, api_key: apiKey });
  if (company) {
    params.set("company", company);
  } else {
    params.set("domain", domain);
  }
  const url = `${HUNTER_URL}?${params.toString()}`;

  let hunterRes;
  let data;
  try {
    hunterRes = await fetch(url);
    data = await hunterRes.json().catch(() => ({}));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Hunter request failed." });
    return;
  }

  if (!hunterRes.ok) {
    const detail = data?.errors?.[0]?.details || `Hunter error ${hunterRes.status}`;
    const exhausted = hunterRes.status === 429 || /usage|limit|quota|credit/i.test(detail);
    // Shared key problem (e.g. global quota) — do not charge the user's credit.
    res.status(hunterRes.status === 429 ? 429 : 502).json({
      error: detail.slice(0, 300),
      exhausted,
      usesRemaining: Math.max(0, FREE_HUNTER_LIMIT - used),
      freeLimit: FREE_HUNTER_LIMIT
    });
    return;
  }

  // A credit was consumed on Hunter's side — charge this account.
  let newUsed = used + 1;
  try {
    newUsed = await incrHunterUsed(user.sub);
  } catch {
    // If the counter write fails, still return the result; best-effort accounting.
  }

  const email = data?.data?.email || null;
  const score = typeof data?.data?.score === "number" ? data.data.score : null;
  res.status(200).json({
    email,
    score,
    usesRemaining: Math.max(0, FREE_HUNTER_LIMIT - newUsed),
    freeLimit: FREE_HUNTER_LIMIT
  });
}
