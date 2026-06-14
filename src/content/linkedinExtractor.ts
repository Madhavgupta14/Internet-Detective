import type { ExperienceItem, LinkedInProfile } from "../shared/types";
import { cleanText, profileMainRoot, textNearHeading, uniqueStrings, visibleTextFrom } from "./domUtils";

function innerLines(el: Element): string[] {
  const raw = "innerText" in el ? (el as HTMLElement).innerText : el.textContent ?? "";
  return raw
    .split(/\n+/)
    .map(cleanText)
    .filter((line) => line.length > 1 && line.length < 300 && !profileChromePatterns.some((p) => p.test(line)));
}

function sectionForHeading(pattern: RegExp): Element | null {
  const root = profileMainRoot();
  const heading = Array.from(
    root.querySelectorAll("section h2, section h3, section span[aria-hidden='true'], h2, h3")
  ).find((el) => pattern.test(cleanText(el.textContent)));
  return heading ? heading.closest("section") : null;
}

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

  // Only return headline as role if it looks like an actual job title
  const titleKeyword = /\b(director|manager|engineer|vp|vice president|chief|founder|head|lead|analyst|consultant|specialist|associate|partner|executive|officer|president|recruiter|developer|designer|researcher|scientist|architect)\b/i;
  if (titleKeyword.test(headline)) {
    return { role: headline };
  }
  return {};
}

function extractExperience(): ExperienceItem[] {
  const section = sectionForHeading(/^experience$/i);
  if (section) {
    const listItems = Array.from(section.querySelectorAll("li"));
    const domItems: ExperienceItem[] = listItems
      .flatMap((li): ExperienceItem[] => {
        const lines = innerLines(li);
        if (lines.length === 0) return [];
        const title = lines[0];
        if (!title || title.length > 120 || /^experience$/i.test(title)) return [];
        // Company line: may have "· Full-time" or "· Part-time" appended
        const companyRaw = lines[1] ?? "";
        const company = cleanText(companyRaw.split("\u00b7")[0]);
        const duration = lines.find((l) => /\d+\s*(yr|mo|year|month)/i.test(l));
        const descLines = lines
          .slice(2)
          .filter((l) => !/^\d+\s*(yr|mo)/i.test(l) && !/^(full-time|part-time|contract|freelance)$/i.test(l));
        return [{ title, company, duration, description: descLines.join(" ").slice(0, 600) }];
      })
      .filter((item) => item.title.length >= 2);

    // De-duplicate: nested company groupings produce duplicate child items
    const seen = new Set<string>();
    const deduped = domItems.filter((item) => {
      const key = `${item.title}|${item.company}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (deduped.length > 0) return deduped.slice(0, 12);
  }

  // Fallback: text-based extraction for edge cases
  const sectionText = textNearHeading(/^experience\b/i);
  if (!sectionText) return [];
  const rawItems = sectionText
    .replace(/^experience\s*/i, "")
    .split(/(?=(?:Founder|Co-Founder|CEO|CTO|CPO|COO|VP|Vice President|Head|Director|Manager|Engineer|Recruiter|Talent|Sales|Account Executive|Member|Consultant|Intern|Analyst|Associate|Partner)\b)/i)
    .map(cleanText)
    .filter((item) => item.length > 20)
    .slice(0, 10);
  return rawItems.map((item) => {
    const parts = item.split(/\s{2,}|\bat\b|\u00b7/i).map(cleanText).filter(Boolean);
    return {
      title: parts[0] || item.slice(0, 80),
      company: parts[1] || "",
      duration: parts.find((part) => /\d+\s*(yr|mo|year|month)/i.test(part)),
      description: item.slice(0, 600)
    };
  });
}

function extractSkills(): string[] {
  const skillsText = textNearHeading(/^skills\b/i);
  const sectionSkills = skillsText
    ? skillsText
        .replace(/^skills\s*/i, "")
        .split(/Show all\b|Endorse\w*|Recommendations?\b|,|\u00b7|\n/i)
        .map(cleanText)
        .filter((skill) => skill.length >= 2 && skill.length <= 50 && !/^\d/.test(skill) && !/^(ment|ing|ed|tion|ity)$/i.test(skill))
    : [];

  const keywordSkills =
    visibleTextFrom(profileMainRoot()).match(/\b(?:AI|ML|Machine Learning|Data Science|Python|JavaScript|TypeScript|React|Node(?:\.js)?|Java|Go|Rust|AWS|Azure|GCP|Kubernetes|DevOps|Security|Product Management|Growth|Sales|Marketing|Talent Acquisition|Recruiting|HR|Operations|Finance|Supply Chain|Ecommerce|D2C)\b/gi) ??
    [];

  return uniqueStrings([...sectionSkills, ...keywordSkills].map((skill) => cleanText(skill))).slice(0, 24);
}

function extractSectionEntries(headingExact: RegExp, headingLoose: RegExp, maxEntries: number): string[] {
  const section = sectionForHeading(headingExact);
  if (section) {
    const entries = Array.from(section.querySelectorAll("li"))
      .map((li) => uniqueStrings(innerLines(li)).slice(0, 5).join(" \u00b7 "))
      .filter((entry) => entry.length > 3)
      .slice(0, maxEntries);
    if (entries.length > 0) {
      return uniqueStrings(entries);
    }
  }
  const text = textNearHeading(headingLoose).replace(headingLoose, "").trim();
  return text ? [text.slice(0, 600)] : [];
}

function extractEducation(): string[] {
  return extractSectionEntries(/^education$/i, /^education\b/i, 6);
}

function extractCertifications(): string[] {
  return extractSectionEntries(/^(licenses & certifications|licenses and certifications|certifications)$/i, /^(licenses|certifications)\b/i, 8);
}

function extractConnections(): string | undefined {
  const text = visibleTextFrom(profileMainRoot());
  const match = text.match(/([\d][\d,.+]*)\s*connections?\b/i);
  return match ? cleanText(match[0]) : undefined;
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

function extractFollowers(): number | undefined {
  const text = visibleTextFrom(profileMainRoot());
  // Matches "8,513 followers", "8.5K followers", "1.2M followers".
  const match = text.match(/([\d][\d,.]*)\s*([km])?\s*followers\b/i);
  if (!match) {
    return undefined;
  }
  let value = parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(value)) {
    return undefined;
  }
  const unit = (match[2] ?? "").toLowerCase();
  if (unit === "k") value *= 1000;
  if (unit === "m") value *= 1_000_000;
  return Math.round(value);
}

function confidenceFor(profile: Omit<LinkedInProfile, "extractionConfidence">): number {
  let confidence = 15;
  if (profile.name) confidence += 18;
  if (profile.headline) confidence += 18;
  if (profile.experience.length > 0) confidence += 18;
  if (profile.about) confidence += 8;
  if (profile.education.length > 0) confidence += 8;
  if (profile.skills.length > 0) confidence += 8;
  if (profile.activity.length > 0) confidence += 7;
  return Math.min(confidence, 96);
}

export function extractLinkedInProfile(): LinkedInProfile {
  const name = extractName();
  const headline = extractHeadline(name);
  const experience = extractExperience();
  const education = extractEducation();
  const certifications = extractCertifications();
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
    about: textNearHeading(/^about\b/i).replace(/^about\s*/i, "").slice(0, 1500),
    experience,
    education,
    certifications,
    skills: extractSkills(),
    activity: extractActivity(),
    followers: extractFollowers(),
    connections: extractConnections(),
    rawTextSample: [
      visibleTextFrom(profileMainRoot()).slice(0, 4000),
      education.length ? `Education: ${education.join(" | ")}` : "",
      certifications.length ? `Certifications: ${certifications.join(" | ")}` : ""
    ].filter(Boolean).join(" | ")
  };

  return {
    ...profileWithoutConfidence,
    extractionConfidence: confidenceFor(profileWithoutConfidence)
  };
}
