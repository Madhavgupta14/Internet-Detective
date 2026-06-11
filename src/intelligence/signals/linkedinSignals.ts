import type { LinkedInProfile, LinkedInSignals, SignalFactor } from "../../shared/types";
import { clamp } from "../../shared/scoring";

type Rule = {
  pattern: RegExp;
  label: string;
  seniority?: number;
  leadership?: number;
  titleAuthority?: number;
  founderLikelihood?: number;
  startupAffinity?: number;
  hiringLanguage?: number;
  teamGrowth?: number;
  companyInfluence?: number;
  recruitingRelevance?: number;
  technicalDepth?: number;
};

const titleRules: Rule[] = [
  { pattern: /\b(founder|co-founder|cofounder|owner)\b/i, label: "Current founder title", seniority: 76, leadership: 72, titleAuthority: 80, founderLikelihood: 92, startupAffinity: 40, companyInfluence: 45 },
  { pattern: /\b(chief|ceo|cto|cpo|coo|cfo|cmo|president)\b/i, label: "Current executive title", seniority: 80, leadership: 78, titleAuthority: 82, founderLikelihood: 18, companyInfluence: 50 },
  { pattern: /\b(vp|vice president|svp|evp)\b/i, label: "VP-level title", seniority: 64, leadership: 60, titleAuthority: 62, companyInfluence: 30 },
  { pattern: /\b(head of|global head|director|principal)\b/i, label: "Department leadership title", seniority: 52, leadership: 55, titleAuthority: 48, companyInfluence: 20 },
  { pattern: /\b(manager|lead|staff|architect)\b/i, label: "Team leadership title", seniority: 34, leadership: 38, titleAuthority: 26 },
  { pattern: /\b(recruiter|talent acquisition|people partner|hrbp|human resources)\b/i, label: "Recruiting function", recruitingRelevance: 28, hiringLanguage: 10 },
  { pattern: /\b(engineering|software|platform|data|ai|machine learning|ml|security|devops)\b/i, label: "Technical role language", technicalDepth: 20 }
];

const bodyRules: Rule[] = [
  { pattern: /\b(hiring|we're hiring|join my team|open roles|job opening|looking for)\b/i, label: "Hiring language", hiringLanguage: 32, teamGrowth: 12 },
  { pattern: /\b(growing our team|scaling the team|team growth|expanding)\b/i, label: "Team growth language", teamGrowth: 28, hiringLanguage: 12 },
  { pattern: /\b(startup|seed|series a|series b|venture-backed|yc|accelerator|stealth)\b/i, label: "Startup ecosystem language", startupAffinity: 25, founderLikelihood: 8 },
  { pattern: /\b(founded|co-founded|launched a company|launched a startup|bootstrapped|entrepreneur)\b/i, label: "Entrepreneurial language", founderLikelihood: 22, startupAffinity: 15 },
  { pattern: /\b(building (?:a|the|my|our) (?:company|startup|product|team|platform))\b/i, label: "Builder language", founderLikelihood: 12, startupAffinity: 10 },
  { pattern: /\b(board|advisor|investor|angel|portfolio)\b/i, label: "Investor or advisor signal", companyInfluence: 16, seniority: 10 },
  { pattern: /\b(managed|led|built a team|reports to me|organization)\b/i, label: "Management evidence", leadership: 18, seniority: 10 }
];

const skillKeywords = [
  "AI",
  "Machine Learning",
  "Data Science",
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Java",
  "Go",
  "Rust",
  "AWS",
  "Azure",
  "GCP",
  "Kubernetes",
  "DevOps",
  "Security",
  "Product Management",
  "Growth",
  "Sales",
  "Marketing",
  "Talent Acquisition",
  "Recruiting",
  "Operations",
  "Finance",
  "Supply Chain",
  "Ecommerce",
  "D2C"
];

const hiringNoisePatterns = [
  /\b(contact info|connections?|followers?|premium|reactivate premium|my network|messaging|notifications|search|profile|linkedin|he\/him|she\/her|they\/them|1st|2nd|3rd|excellence)\b/i,
  /\b(view all|open to|show all|follow|connect|message|more)\b/i
];

const hiringRolePatterns = [
  /\b(engineer|developer|designer|analyst|manager|specialist|consultant|lead|head|director|product|sales|marketing|talent|recruiter|hr|research|data|operations|architect|founder|co-founder|executive|partner)\b/i
];

const skillNoisePatterns = [
  /\b(contact info|connections?|followers?|premium|reactivate premium|my network|messaging|notifications|search|profile|linkedin|he\/him|she\/her|they\/them|1st|2nd|3rd|excellence)\b/i,
  /\b(view all|open to|show all|follow|connect|message|more)\b/i
];

function normalizeCandidate(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\s*[\u00b7|]+\s*/g, " ").trim();
}

function hasNoise(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function isLikelyHiringScope(value: string): boolean {
  const clean = normalizeCandidate(value);
  if (!clean || clean.length < 3 || clean.length > 70) {
    return false;
  }
  if (hasNoise(clean, hiringNoisePatterns)) {
    return false;
  }
  if (!hiringRolePatterns.some((pattern) => pattern.test(clean))) {
    return false;
  }
  const words = clean.split(/\s+/);
  return words.length >= 2 && words.length <= 6;
}

function isLikelySkill(value: string): boolean {
  const clean = normalizeCandidate(value);
  if (!clean || clean.length < 2 || clean.length > 50) {
    return false;
  }
  if (hasNoise(clean, skillNoisePatterns)) {
    return false;
  }
  return /^[A-Za-z][A-Za-z0-9.+/&-]*(?:\s+[A-Za-z][A-Za-z0-9.+/&-]*){0,3}$/.test(clean);
}

function evidenceSnippet(pattern: RegExp, text: string): string {
  const match = text.match(pattern);
  if (!match?.index && match?.index !== 0) {
    return text.slice(0, 180);
  }

  const start = Math.max(match.index - 70, 0);
  const end = Math.min(match.index + match[0].length + 90, text.length);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";
  return `${prefix}${text.slice(start, end)}${suffix}`.replace(/\s+/g, " ").trim();
}

function addFactor(factors: SignalFactor[], label: string, impact: number, evidence: string): void {
  if (!evidence || impact <= 0) {
    return;
  }

  const existing = factors.find((factor) => factor.label === label);
  if (!existing) {
    factors.push({ label, impact: Math.round(impact), evidence: evidence.slice(0, 190) });
  }
}

function applyRule(
  signals: Omit<LinkedInSignals, "confidence" | "evidence">,
  factors: SignalFactor[],
  rule: Rule,
  text: string,
  weight: number
): void {
  if (!rule.pattern.test(text)) {
    return;
  }

  const snippet = evidenceSnippet(rule.pattern, text);
  const entries = Object.entries(rule).filter(([key]) => key !== "pattern" && key !== "label") as Array<[
    keyof Omit<Rule, "pattern" | "label">,
    number
  ]>;

  for (const [key, value] of entries) {
    signals[key] = clamp((signals[key] ?? 0) + value * weight);
    addFactor(factors, rule.label, value * weight, snippet);
  }
}

function textCorpus(profile: LinkedInProfile): string {
  return [
    profile.name,
    profile.headline,
    profile.currentRole,
    profile.currentCompany,
    profile.about,
    profile.experience.map((item) => `${item.title} ${item.company} ${item.description ?? ""}`).join(" "),
    profile.skills.join(" ")
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeScope(value: string): string {
  return value
    .replace(/\s+(?:at|@)\s+[^|,]+$/i, "")
    .replace(/\s+[–—-]\s+[^|,]+$/i, "")
    .replace(/#/g, "")
    .replace(/\b(?:apply|dm me|reach out|interested|link in comments|comment below|send cv|send resume)\b.*$/i, "")
    .replace(/[.!?].*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^for\s+/i, "");
}

function extractHiringScope(text: string): string[] {
  const scopes: string[] = [];
  const patterns = [
    /\b(?:we'?re|we are|i'?m|i am|actively)?\s*hiring\s+(?:for\s+)?([^.;|]{3,100})/gi,
    /\b(?:looking for|seeking)\s+([^.;|]{3,100})/gi,
    /\b(?:open roles?|job openings?|roles? open)\s+(?:for|in|on)?\s*([^.;|]{3,100})/gi,
    /\bjoin (?:my|our|the) team\s+(?:as|for|in)?\s*([^.;|]{0,100})/gi
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const scope = normalizeScope(match[1] ?? "");
      if (isLikelyHiringScope(scope)) {
        scopes.push(scope);
      }
    }
  }

  return [...new Set(scopes.map((scope) => scope.toLowerCase()))].map((scope) => scope.replace(/\b\w/g, (char) => char.toUpperCase())).slice(0, 5);
}

function extractSkillSignals(profile: LinkedInProfile, text: string): string[] {
  const fromProfile = profile.skills.filter((skill) => isLikelySkill(skill));
  const fromText = skillKeywords.filter((skill) => new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
  return [...new Set([...fromProfile, ...fromText].map((skill) => skill.trim()).filter(Boolean))].slice(0, 10);
}

export function extractLinkedInSignals(profile: LinkedInProfile): LinkedInSignals {
  const signals = {
    seniority: 0,
    leadership: 0,
    titleAuthority: 0,
    founderLikelihood: 0,
    startupAffinity: 0,
    hiringLanguage: 0,
    teamGrowth: 0,
    companyInfluence: 0,
    recruitingRelevance: 0,
    technicalDepth: 0,
    hiringScope: [] as string[],
    skillSignals: [] as string[]
  };
  const evidence: SignalFactor[] = [];

  const currentTitle = [profile.currentRole, profile.headline].filter(Boolean).join(" ");
  for (const rule of titleRules) {
    applyRule(signals, evidence, rule, currentTitle, 1.15);
  }

  profile.experience.forEach((item, index) => {
    const weight = index === 0 ? 1 : 0.55;
    for (const rule of titleRules) {
      applyRule(signals, evidence, rule, `${item.title} ${item.company} ${item.description ?? ""}`, weight);
    }
  });

  const fullText = textCorpus(profile);
  for (const rule of bodyRules) {
    applyRule(signals, evidence, rule, fullText, 1);
  }

  signals.hiringScope = extractHiringScope(fullText);
  signals.skillSignals = extractSkillSignals(profile, fullText);

  if (signals.hiringScope.length > 0) {
    const scopeEvidence = `Visible hiring scope: ${signals.hiringScope.join(", ")}`;
    signals.hiringLanguage = clamp(signals.hiringLanguage + 18);
    signals.teamGrowth = clamp(signals.teamGrowth + 10);
    addFactor(evidence, "Hiring scope extracted", 18, scopeEvidence);
  }

  if (signals.skillSignals.length > 0) {
    addFactor(evidence, "Visible skill signals", Math.min(18, signals.skillSignals.length * 3), signals.skillSignals.join(", "));
  }

  const confidence = clamp(
    profile.extractionConfidence * 0.65 +
      Math.min(evidence.length * 5, 25),
    0,
    95
  );

  return {
    ...signals,
    confidence,
    evidence: evidence.sort((a, b) => b.impact - a.impact).slice(0, 18)
  };
}
