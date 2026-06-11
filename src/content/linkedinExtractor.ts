import type { ExperienceItem, LinkedInProfile } from "../shared/types";
import { cleanText, profileMainRoot, textNearHeading, uniqueStrings, visibleTextFrom } from "./domUtils";

const profileChromePatterns = [
  /^reactivate premium$/i,
  /^my network$/i,
  /^messaging$/i,
  /^notifications$/i,
  /^jobs$/i,
  /^home$/i,
  /^for business$/i,
  /^join premium$/i,
  /^premium$/i,
  /^search$/i,
  /^me$/i,
  /^contact info$/i,
  /^\d+(?:,\d+)? followers?$/i,
  /^\d+(?:,\d+)? connections?$/i,
  /^follow$/i,
  /^connect$/i,
  /^message$/i,
  /^more$/i,
  /^open to$/i,
  /^profile actions$/i,
  /^view .* profile$/i
];

const headlineRolePatterns = [
  /\b(vice president|vp|svp|evp|president|chief|ceo|cto|cfo|cmo|coo|founder|co-founder|cofounder|owner|partner|principal|director|head of|head|manager|lead|architect|engineer|developer|recruiter|talent|hr|sales|marketing|product|operations|data|science|research)\b/i
];

function firstText(selectors: string[]): string {
  for (const selector of selectors) {
    const value = cleanText(document.querySelector(selector)?.textContent);
    if (value) {
      return value;
    }
  }
  return "";
}

function visibleLines(): string[] {
  const root = profileMainRoot();
  const bodyText = "innerText" in root ? ((root as HTMLElement).innerText ?? "") : document.body?.innerText ?? "";
  if (!bodyText) {
    return [];
  }

  return uniqueStrings(
    bodyText
      .split(/\r?\n/)
      .map(cleanText)
      .filter((line) => line.length > 1 && line.length < 220)
      .filter((line) => !profileChromePatterns.some((pattern) => pattern.test(line)))
  );
}

function extractName(): string {
  const name = firstText([
    ".pv-top-card .text-heading-xlarge",
    ".pv-text-details__left-panel .text-heading-xlarge",
    ".text-heading-xlarge",
    ".pv-text-details__left-panel h1",
    ".ph5 h1",
    "main h1"
  ]);
  if (name && !profileChromePatterns.some((pattern) => pattern.test(name))) {
    return name;
  }

  return (
    visibleLines().find((line) => {
      return /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,4}$/.test(line) && !profileChromePatterns.some((pattern) => pattern.test(line));
    }) ?? ""
  );
}

function looksLikeHeadline(line: string, name: string): boolean {
  if (!line || line === name || profileChromePatterns.some((pattern) => pattern.test(line))) {
    return false;
  }

  if (/^(about|activity|experience|education|skills|licenses|recommendations|posts)\b/i.test(line)) {
    return false;
  }

  if (headlineRolePatterns.some((pattern) => pattern.test(line))) {
    return true;
  }

  if (/[|@]/.test(line)) {
    return true;
  }

  return /\b(hiring|at)\b/i.test(line) && line.length >= 10;
}

function extractHeadline(name = extractName()): string {
  const selected = firstText([
    ".pv-text-details__left-panel .text-body-medium.break-words",
    ".text-body-medium.break-words",
    ".pv-text-details__left-panel .text-body-medium",
    ".pv-top-card--list-bullet + div",
    ".pv-top-card-v2-ctas + div",
    "main h1 + div"
  ]);
  if (looksLikeHeadline(selected, name)) {
    return selected;
  }

  const lines = visibleLines();
  const nameIndex = lines.findIndex((line) => line === name);
  const nearby = nameIndex >= 0 ? lines.slice(nameIndex + 1, nameIndex + 8) : lines.slice(0, 12);
  const candidates = uniqueStrings(
    nearby.flatMap((line, index) => {
      const next = nearby[index + 1];
      return next ? [line, `${line} ${next}`] : [line];
    })
  );

  return candidates.find((line) => looksLikeHeadline(line, name)) ?? "";
}

function extractLocation(): string | undefined {
  const candidates = Array.from(document.querySelectorAll("span.text-body-small, main span"))
    .map((element) => cleanText(element.textContent))
    .filter((text) => /area|india|united states|remote|city|greater|metro/i.test(text));
  return candidates[0];
}

function splitRoleCompany(text: string): { role?: string; company?: string } {
  const headline = cleanText(text);
  if (!headline) {
    return {};
  }

  const match =
    headline.match(/^(.+?)\s+(?:at|@)\s+([^|,]+)(?:[|,].*)?$/i) ??
    headline.match(/^(.+?)\s+(?:-|\u2013|\u2014)\s+([^|,]+)(?:[|,].*)?$/i);
  if (match) {
    return { role: cleanText(match[1]), company: cleanText(match[2]) };
  }

  return { role: headline };
}

function extractExperience(): ExperienceItem[] {
  const sectionText = textNearHeading(/^experience\b/i);
  if (!sectionText) {
    return [];
  }

  const rawItems = sectionText
    .replace(/^experience\s*/i, "")
    .split(/(?=(?:Founder|Co-Founder|CEO|CTO|CPO|COO|VP|Vice President|Head|Director|Manager|Engineer|Recruiter|Talent|Sales|Account Executive)\b)/i)
    .map(cleanText)
    .filter((item) => item.length > 20)
    .slice(0, 8);

  return rawItems.map((item) => {
    const parts = item.split(/\s{2,}|\bat\b|\u00b7/i).map(cleanText).filter(Boolean);
    return {
      title: parts[0] || item.slice(0, 80),
      company: parts[1] || "",
      duration: parts.find((part) => /\d+\s*(yr|mo|year|month)/i.test(part)),
      description: item.slice(0, 500)
    };
  });
}

function extractSkills(): string[] {
  const skillsText = textNearHeading(/^skills\b/i);
  const sectionSkills = skillsText
    ? skillsText
        .replace(/^skills\s*/i, "")
        .split(/Show all|Endorse|Recommendations|,|\u00b7|\n/i)
        .map(cleanText)
        .filter((skill) => skill.length >= 2 && skill.length <= 50)
    : [];

  const keywordSkills =
    visibleTextFrom(profileMainRoot()).match(/\b(?:AI|ML|Machine Learning|Data Science|Python|JavaScript|TypeScript|React|Node(?:\.js)?|Java|Go|Rust|AWS|Azure|GCP|Kubernetes|DevOps|Security|Product Management|Growth|Sales|Marketing|Talent Acquisition|Recruiting|HR|Operations|Finance|Supply Chain|Ecommerce|D2C)\b/gi) ??
    [];

  return uniqueStrings([...sectionSkills, ...keywordSkills].map((skill) => cleanText(skill))).slice(0, 24);
}

function extractActivity(): { text: string; date?: string }[] {
  const activityText = textNearHeading(/^(activity|posts)\b/i);
  if (!activityText) {
    return [];
  }

  return activityText
    .replace(/^(activity|posts)\s*/i, "")
    .split(/(?=\b(?:Reposted|Posted|Commented|Shared|\d+[dwmy]\b))/i)
    .map(cleanText)
    .filter((text) => text.length > 30)
    .slice(0, 6)
    .map((text) => ({ text: text.slice(0, 700) }));
}

function confidenceFor(profile: Omit<LinkedInProfile, "extractionConfidence">): number {
  let confidence = 20;
  if (profile.name) confidence += 20;
  if (profile.headline) confidence += 20;
  if (profile.experience.length > 0) confidence += 20;
  if (profile.skills.length > 0) confidence += 10;
  if (profile.activity.length > 0) confidence += 10;
  return Math.min(confidence, 95);
}

export function extractLinkedInProfile(): LinkedInProfile {
  const name = extractName();
  const headline = extractHeadline(name);
  const experience = extractExperience();
  const roleCompany = splitRoleCompany(headline);
  const currentFromExperience = experience[0] ? { role: experience[0].title, company: experience[0].company } : {};
  const profileWithoutConfidence: Omit<LinkedInProfile, "extractionConfidence"> = {
    source: "linkedin",
    url: window.location.href,
    extractedAt: new Date().toISOString(),
    name,
    headline,
    location: extractLocation(),
    currentRole: roleCompany.role || currentFromExperience.role,
    currentCompany: roleCompany.company || currentFromExperience.company,
    about: textNearHeading(/^about\b/i).replace(/^about\s*/i, "").slice(0, 1200),
    experience,
    skills: extractSkills(),
    activity: extractActivity(),
    rawTextSample: visibleTextFrom(profileMainRoot()).slice(0, 3000)
  };

  return {
    ...profileWithoutConfidence,
    extractionConfidence: confidenceFor(profileWithoutConfidence)
  };
}
