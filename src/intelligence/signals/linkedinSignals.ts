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
  { pattern: /\b(senior|sr\.?|associate|specialist)\b/i, label: "Senior IC title", seniority: 22, titleAuthority: 14 },
  { pattern: /\b(recruiter|talent acquisition|people partner|hrbp|human resources)\b/i, label: "Recruiting function", recruitingRelevance: 28, hiringLanguage: 10 },
  { pattern: /\b(engineering|software|platform|data|ai|machine learning|ml|security|devops)\b/i, label: "Technical role language", technicalDepth: 20 },
  { pattern: /\b(swe|sde|mle|sre|tpm|pm|apm|gpm|em|ic\d?)\b/i, label: "Tech role abbreviation", technicalDepth: 16, seniority: 10 }
];

const bodyRules: Rule[] = [
  { pattern: /\b(hiring|we're hiring|join my team|open roles|job opening|looking for)\b/i, label: "Hiring language", hiringLanguage: 32, teamGrowth: 12 },
  { pattern: /\b(growing our team|scaling the team|team growth|expanding)\b/i, label: "Team growth language", teamGrowth: 28, hiringLanguage: 12 },
  { pattern: /\b(startup|seed|series a|series b|venture-backed|yc|accelerator|stealth)\b/i, label: "Startup ecosystem language", startupAffinity: 25, founderLikelihood: 8 },
  { pattern: /\b(founded|co-founded|launched a company|launched a startup|bootstrapped|entrepreneur)\b/i, label: "Entrepreneurial language", founderLikelihood: 22, startupAffinity: 15 },
  { pattern: /\b(building (?:a|the|my|our) (?:company|startup|product|team|platform))\b/i, label: "Builder language", founderLikelihood: 12, startupAffinity: 10 },
  { pattern: /\b(board|advisor|investor|angel|portfolio)\b/i, label: "Investor or advisor signal", companyInfluence: 16, seniority: 10 },
  { pattern: /\b(managed|led|built a team|reports to me|organization)\b/i, label: "Management evidence", leadership: 18, seniority: 10 },
  { pattern: /\b(transform|transforming|reshape|reshaping|reinvent|scale up|overhaul)\b/i, label: "Transformation leadership language", leadership: 14, seniority: 10, companyInfluence: 8 },
  { pattern: /\b(strategy|strategic|roadmap|vision|driving|execution|cross-functional)\b/i, label: "Strategic ownership language", leadership: 12, seniority: 8, titleAuthority: 10 },
  { pattern: /\b(google|meta|apple|microsoft|amazon|netflix|openai|stripe|airbnb|uber|linkedin|twitter|spacex|deepmind|salesforce)\b/i, label: "Top-tier company experience", seniority: 18, titleAuthority: 12, companyInfluence: 14 },
  { pattern: /\b(ipo|exit|acquisition|series [a-e]|raised|funding|valuation)\b/i, label: "Growth-stage company signal", startupAffinity: 20, companyInfluence: 12, founderLikelihood: 8 },
  { pattern: /\b(ypo|young presidents|eo network|entrepreneurs organization|techstars|harvard|mit|stanford|wharton|lbs|insead|iit|iim|ntu|nus)\b/i, label: "Prestige network or institution", seniority: 16, companyInfluence: 14, founderLikelihood: 6 }
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
  return words.length >= 1 && words.length <= 7;
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
    profile.rawTextSample,
    profile.experience.map((item) => `${item.title} ${item.company} ${item.description ?? ""}`).join(" "),
    profile.education.join(" "),
    profile.certifications.join(" "),
    profile.activity.map((item) => item.text).join(" "),
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
    // Cut trailing clauses so "design engineer to own the end-to-end product" -> "design engineer".
    .replace(/\b(?:to|who|that|which|where|so|in order to|with|from)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:a|an|the|our|my|some|several|multiple)\s+/i, "")
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

  // Founder/builder signal from the headline, even without the literal word "founder".
  const headline = profile.headline ?? "";
  if (/\b(founder|co-?founder|building something|building the future|currently building|now building|we'?re building|stealth|0 to 1|zero to one|bootstrapping)\b/i.test(headline)) {
    signals.founderLikelihood = clamp(signals.founderLikelihood + 60);
    signals.startupAffinity = clamp(signals.startupAffinity + 38);
    signals.titleAuthority = clamp(signals.titleAuthority + 24);
    addFactor(evidence, "Founder/builder headline", 60, headline);
  } else if (/\bbuilding\b/i.test(headline)) {
    signals.founderLikelihood = clamp(signals.founderLikelihood + 34);
    signals.startupAffinity = clamp(signals.startupAffinity + 22);
    addFactor(evidence, "Founder/builder headline", 34, headline);
  }

  // Company ownership language ("we at <Company> are hiring") implies founder/operator.
  const ownershipMatch = fullText.match(/\bwe(?:'re| are)?\s+(?:at|building)\s+([A-Z][A-Za-z0-9.&-]+)/);
  if (ownershipMatch) {
    signals.founderLikelihood = clamp(signals.founderLikelihood + 22);
    signals.companyInfluence = clamp(signals.companyInfluence + 16);
    addFactor(evidence, "Founder ownership language", 22, evidenceSnippet(/\bwe(?:'re| are)?\s+(?:at|building)\s+[A-Za-z0-9.&-]+/, fullText));
  }

  signals.hiringScope = extractHiringScope(fullText);
  signals.skillSignals = extractSkillSignals(profile, fullText);

  // An explicit, active hiring post is the strongest possible hiring-intent evidence.
  const activeHiring =
    /\b(we'?re hiring|we are hiring|i'?m hiring|i am hiring|now hiring|actively hiring|hiring for|we'?re looking for|join (?:my|our) team|open (?:role|position))\b/i.test(fullText);
  if (activeHiring) {
    signals.hiringLanguage = clamp(Math.max(signals.hiringLanguage, 90));
    signals.teamGrowth = clamp(Math.max(signals.teamGrowth, 72));
    signals.recruitingRelevance = clamp(Math.max(signals.recruitingRelevance, 45));
    signals.leadership = clamp(signals.leadership + 18);
    addFactor(evidence, "Active hiring post", 90, evidenceSnippet(/\b(?:hiring|looking for|join (?:my|our) team)\b[^.!?]*/i, fullText));
  }

  if (signals.hiringScope.length > 0) {
    const scopeEvidence = `Visible hiring scope: ${signals.hiringScope.join(", ")}`;
    signals.hiringLanguage = clamp(signals.hiringLanguage + 18);
    signals.teamGrowth = clamp(signals.teamGrowth + 10);
    addFactor(evidence, "Hiring scope extracted", 18, scopeEvidence);
  }

  // Audience reach: follower count is a real influence/decision signal.
  const followers = profile.followers ?? 0;
  if (followers > 0) {
    const reach = followers >= 50000 ? 40 : followers >= 10000 ? 32 : followers >= 5000 ? 24 : followers >= 2000 ? 16 : followers >= 1000 ? 9 : 0;
    if (reach > 0) {
      signals.companyInfluence = clamp(signals.companyInfluence + reach);
      signals.seniority = clamp(signals.seniority + Math.round(reach * 0.4));
      addFactor(evidence, "Audience reach", reach, `${followers.toLocaleString()} followers`);
    }
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
