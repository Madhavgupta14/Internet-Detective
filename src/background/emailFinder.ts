import { HOSTED_ENDPOINT } from "../shared/constants";
import type { AppSettings, EmailResult, LinkedInAnalysis } from "../shared/types";

function sanitizePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function guessDomain(company: string): string {
  return sanitizePart(company) + ".com";
}

function emailPatterns(first: string, last: string, domain: string): EmailResult[] {
  const f = sanitizePart(first);
  const l = sanitizePart(last);
  if (!f || !l || !domain) return [];
  return [
    { email: `${f}.${l}@${domain}`, confidence: 42, source: "pattern" },
    { email: `${f}@${domain}`, confidence: 30, source: "pattern" },
    { email: `${f}${l}@${domain}`, confidence: 25, source: "pattern" },
    { email: `${f[0]}${l}@${domain}`, confidence: 20, source: "pattern" },
    { email: `${f}.${l[0]}@${domain}`, confidence: 16, source: "pattern" },
    { email: `${l}.${f}@${domain}`, confidence: 12, source: "pattern" },
  ];
}

type HunterOutcome = {
  results: EmailResult[];
  exhausted: boolean;
  usesRemaining?: number;
  freeLimit?: number;
  error?: string;
};

// Direct Hunter call using the user's own key (no shared-quota cost, no limit).
async function hunterEmailFinder(first: string, last: string, domain: string, apiKey: string): Promise<HunterOutcome> {
  const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(first)}&last_name=${encodeURIComponent(last)}&api_key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url);
    if (res.status === 429) return { results: [], exhausted: true };
    if (!res.ok) return { results: [], exhausted: false };
    const data = (await res.json()) as { data?: { email?: string; score?: number } };
    if (data.data?.email) {
      return { results: [{ email: data.data.email, confidence: data.data.score ?? 70, source: "hunter" }], exhausted: false };
    }
  } catch {
    // Network error — fall through to patterns.
  }
  return { results: [], exhausted: false };
}

// Shared lookup via the hosted proxy (key + per-account limit enforced server-side).
async function hostedEmailFinder(first: string, last: string, domain: string, endpoint: string, token: string): Promise<HunterOutcome> {
  const base = (endpoint || HOSTED_ENDPOINT).replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/find-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ domain, first_name: first, last_name: last })
    });
    const data = (await res.json().catch(() => ({}))) as {
      email?: string | null;
      score?: number | null;
      exhausted?: boolean;
      usesRemaining?: number;
      freeLimit?: number;
      error?: string;
    };

    const meta = { usesRemaining: data.usesRemaining, freeLimit: data.freeLimit };

    if (res.status === 403) {
      return { results: [], exhausted: false, error: data.error, ...meta };
    }
    if (res.status === 429 || data.exhausted) {
      return { results: [], exhausted: true, error: data.error, ...meta };
    }
    if (!res.ok) {
      return { results: [], exhausted: false, error: data.error, ...meta };
    }
    if (data.email) {
      return { results: [{ email: data.email, confidence: data.score ?? 70, source: "hunter" }], exhausted: false, ...meta };
    }
    return { results: [], exhausted: false, ...meta };
  } catch {
    return { results: [], exhausted: false };
  }
}

// Reads the signed-in account's remaining shared credits without spending one.
export async function fetchAccountCredits(endpoint: string, token: string): Promise<{ usesRemaining?: number; freeLimit?: number }> {
  const base = (endpoint || HOSTED_ENDPOINT).replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return {};
    const data = (await res.json()) as { usesRemaining?: number; freeLimit?: number };
    return { usesRemaining: data.usesRemaining, freeLimit: data.freeLimit };
  } catch {
    return {};
  }
}

export type EmailFinderResult = {
  name: string;
  domain: string;
  results: EmailResult[];
  exhausted: boolean;
  usesRemaining?: number;
  freeLimit?: number;
  usingOwnKey: boolean;
  notice?: string;
};

export async function findEmailsForAnalysis(
  analysis: LinkedInAnalysis,
  settings: AppSettings,
  options: { token: string | null }
): Promise<EmailFinderResult> {
  const nameParts = (analysis.profile.name ?? "").trim().split(/\s+/);
  const first = nameParts[0] ?? "";
  const last = nameParts[nameParts.length - 1] ?? "";
  const company = analysis.profile.currentCompany ?? "";
  const domain = guessDomain(company);

  const ownKey = settings.hunterApiKey?.trim();
  let outcome: HunterOutcome = { results: [], exhausted: false };

  if (ownKey && first && last && domain) {
    outcome = await hunterEmailFinder(first, last, domain, ownKey);
  } else if (options.token && first && last && domain) {
    outcome = await hostedEmailFinder(first, last, domain, settings.apiEndpoint, options.token);
  }

  const results: EmailResult[] = [...outcome.results];
  const patterns = emailPatterns(first, last, domain);
  const existingEmails = new Set(results.map((r) => r.email));
  for (const p of patterns) {
    if (!existingEmails.has(p.email)) results.push(p);
  }
  results.sort((a, b) => b.confidence - a.confidence);

  return {
    name: analysis.profile.name,
    domain,
    results: results.slice(0, 6),
    exhausted: outcome.exhausted,
    usesRemaining: outcome.usesRemaining,
    freeLimit: outcome.freeLimit,
    usingOwnKey: Boolean(ownKey),
    notice: outcome.error
  };
}
