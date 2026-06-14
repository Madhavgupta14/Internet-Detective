// Returns the signed-in account and its remaining Hunter credits.
import { setCors, bearerToken, verifyGoogleToken, getHunterUsed, FREE_HUNTER_LIMIT } from "./_lib.js";

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const user = await verifyGoogleToken(bearerToken(req));
  if (!user) {
    res.status(401).json({ error: "Sign in with Google." });
    return;
  }

  let usesRemaining = FREE_HUNTER_LIMIT;
  try {
    const used = await getHunterUsed(user.sub);
    usesRemaining = Math.max(0, FREE_HUNTER_LIMIT - used);
  } catch {
    // KV unavailable — report full allowance rather than blocking.
  }

  res.status(200).json({ email: user.email, usesRemaining, freeLimit: FREE_HUNTER_LIMIT });
}
