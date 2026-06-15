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
  /^view .* profile$/i,
  // Connection-degree badges that LinkedIn renders next to the name
  /^[·•|]?\s*(?:1st|2nd|3rd)(?:\s+degree)?(?:\s+connections?)?$/i,
  /^(?:1st|2nd|3rd)\s+degree\s+connection$/i
];

// LinkedIn shows a connection-degree badge ("· 1st", "2nd degree connection")
// right beside the name. innerText concatenation drags it into the name or
// headline; strip it so only the real name/title survives.
function stripConnectionDegree(text: string): string {
  let t = cleanText(text);
  // Pronoun badges ("He/Him", "She/Her", "They/Them") render next to the name
  // and leak into the headline/role; drop them wherever they appear.
  t = t.replace(/\b(?:he|she|they)\s*\/\s*(?:him|her|them)\b/gi, " ");
  // "· 1st", "• 2nd", "(3rd)", "1st degree connection" anywhere in the string
  t = t.replace(/[·•(]\s*(?:1st|2nd|3rd)(?:\s+degree(?:\s+connection)?)?\s*\)?/gi, " ");
  // A bare leading degree token: "1st PV Engineer" -> "PV Engineer"
  t = t.replace(/^\s*(?:1st|2nd|3rd)(?:\s+degree(?:\s+connection)?)?\b[\s·•|,-]*/i, "");
  return cleanText(t.replace(/^[·•|,\-–—\s]+/, ""));
}

const MONTHS = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;

// A "company" line that is really a date range, duration, employment type, or
// location should never become the company (it poisons email-domain guessing,
// e.g. "Dec 2016 - Apr 2018" -> "dec2016apr2018.com").
function looksLikeCompany(value: string): boolean {
  const t = cleanText(value);
  if (!t || t.length < 2 || t.length > 80) return false;
  if (/\b(19|20)\d{2}\b/.test(t)) return false; // contains a year
  if (MONTHS.test(t) && /\d/.test(t)) return false; // month + number => date
  if (/\b\d+\s*(yr|yrs|mo|mos|year|years|month|months)\b/i.test(t)) return false; // duration
  if (/\bpresent\b/i.test(t)) return false;
  if (/^(full-time|part-time|contract|freelance|internship|seasonal|self-employed|apprenticeship)$/i.test(t)) return false;
  if (/^(remote|on-?site|hybrid)$/i.test(t)) return false;
  return true;
}

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
    return stripConnectionDegree(name);
  }

  return stripConnectionDegree(
    visibleLines().find((line) => {
      const clean = stripConnectionDegree(line);
      return /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,4}$/.test(clean) && !profileChromePatterns.some((pattern) => pattern.test(clean));
    }) ?? ""
  );
}

// A relaxed check: is this a believable headline string at all? Used for the
// value LinkedIn hands us directly from the top-card subtitle element, which is
// authoritative. We must NOT require a corporate role keyword here — real
// headlines like "Prime Minister of India", "Novelist", or "Chef" have none.
function isPlausibleHeadline(line: string, name: string): boolean {
  if (!line || line === name || profileChromePatterns.some((pattern) => pattern.test(line))) {
    return false;
  }
  if (line.length < 2 || line.length > 220) {
    return false;
  }
  if (/^(about|activity|experience|education|skills|licenses|recommendations|posts|featured|highlights)\b/i.test(line)) {
    return false;
  }
  // A bare location ("Delhi, India", "Greater Seattle Area") is not a headline.
  if (/^[A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+){0,3}\s+area$/i.test(line)) {
    return false;
  }
  return true;
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
  // The top-card subtitle element IS LinkedIn's headline — trust it as long as
  // it is a believable headline string. Only fall back to the heuristic
  // line-scan when the DOM gave us nothing usable.
  if (isPlausibleHeadline(selected, name)) {
    return stripConnectionDegree(selected);
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

  return stripConnectionDegree(candidates.find((line) => looksLikeHeadline(line, name)) ?? "");
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
        // Company is not always line[1] (LinkedIn sometimes leads with a date or
        // employment type). Pick the first following line that reads like a real
        // company name, stripping any "\u00b7 Full-time" suffix.
        const company =
          lines.slice(1).map((l) => cleanText(l.split("\u00b7")[0])).find((l) => looksLikeCompany(l)) ?? "";
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

function extractSkills(ownTextCorpus: string): string[] {
  const skillsText = textNearHeading(/^skills\b/i);
  const sectionSkills = skillsText
    ? skillsText
        .replace(/^skills\s*/i, "")
        .split(/Show all\b|Endorse\w*|Recommendations?\b|,|\u00b7|\n/i)
        .map(cleanText)
        .filter((skill) => skill.length >= 2 && skill.length <= 50 && !/^\d/.test(skill) && !/^(ment|ing|ed|tion|ity)$/i.test(skill))
    : [];

  // Keyword fallback must scan ONLY the target's own authored text (headline,
  // about, experience), never the whole page. profileMainRoot() also contains
  // the "More profiles for you" sidebar, recommended people, ads, and job
  // cards, so a page-wide scan attributes other people's keywords to the
  // target (e.g. a politician's profile showing "AWS, Azure, DevOps, Go").
  const keywordSkills =
    ownTextCorpus.match(/\b(?:AI|ML|Machine Learning|Data Science|Python|JavaScript|TypeScript|React|Node(?:\.js)?|Java|Go|Rust|AWS|Azure|GCP|Kubernetes|DevOps|Security|Product Management|Growth|Sales|Marketing|Talent Acquisition|Recruiting|HR|Operations|Finance|Supply Chain|Ecommerce|D2C)\b/gi) ??
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

// Per-entry chrome that LinkedIn appends inside education/certification cards:
// issue dates, credential IDs, "Show credential", "Show all N", grades, etc.
const ENTRY_CHROME = /^(?:issued\b|expires?\b|expired\b|credential id\b|credential identifier\b|show credential\b|see credential\b|show all\b|skills?:|grade\b|grade:|activities and societies\b)/i;

function entryLines(li: Element): string[] {
  return uniqueStrings(innerLines(li).filter((line) => !ENTRY_CHROME.test(line)));
}

function extractEducation(): string[] {
  const section = sectionForHeading(/^education$/i) ?? sectionForHeading(/education/i);
  if (section) {
    const hasYear = (line: string) => /(?:19|20)\d{2}/.test(line);
    const entries = uniqueStrings(
      Array.from(section.querySelectorAll("li"))
        .map((li) => {
          const lines = innerLines(li);
          const school = lines[0];
          if (!school || school.length > 120) return "";
          const degree = lines.slice(1).find((l) => l !== school && !hasYear(l) && !/^grade\b|grade:/i.test(l));
          const dates = lines.find((l) => hasYear(l) && !/grade/i.test(l));
          const head = [school, degree].filter(Boolean).join(" — ");
          return dates ? `${head} (${cleanText(dates)})` : head;
        })
        .filter((entry) => entry.length > 2)
    ).slice(0, 6);
    if (entries.length > 0) return entries;
  }
  const text = cleanText(textNearHeading(/education/i).replace(/^education\s*/i, ""));
  return text ? [text.slice(0, 400)] : [];
}

function extractCertifications(): string[] {
  const section = sectionForHeading(/licen[cs]e|certificat/i);
  if (section) {
    const names = uniqueStrings(
      Array.from(section.querySelectorAll("li"))
        // The first non-chrome line of each card is the certification name.
        .map((li) => entryLines(li)[0] ?? "")
        .map((name) => cleanText(name.replace(/\s*\(\d+\)\s*$/, "")))
        .filter((name) => name.length >= 3 && name.length <= 120 && !/^licen[cs]es?\b/i.test(name))
    ).slice(0, 12);
    if (names.length > 0) return names;
  }
  // Fallback: at least strip the chrome out of the collapsed-section text blob.
  const blob = cleanText(
    textNearHeading(/licen[cs]e|certificat/i)
      .replace(/^.*?certifications?\s*(?:\(\d+\))?/i, "")
      .replace(/\bissued\s+\w+\.?\s+\d{4}/gi, " ")
      .replace(/\bcredential id\s+\S+/gi, " ")
      .replace(/\bshow credential\b/gi, " ")
      .replace(/\bshow all[^.]*?licen[cs]es?\b/gi, " ")
  );
  return blob ? [blob.slice(0, 400)] : [];
}

function extractProjects(): string[] {
  return extractSectionEntries(/^projects$/i, /^projects\b/i, 8);
}

// LinkedIn's intro card surfaces the current employer (and school) even before
// the Experience section is scrolled into view, via an aria-label like
// "Current company: TestingXperts. Click to skip…". Read that as a reliable
// source for "Now ... at <Company>".
function extractCurrentCompanyTopCard(): string | undefined {
  const root = profileMainRoot();
  const labelled = root.querySelector<HTMLElement>('[aria-label*="Current company" i]');
  if (labelled) {
    const fromLabel = cleanText((labelled.getAttribute("aria-label") ?? "").match(/current company:\s*([^.]+)/i)?.[1] ?? "");
    if (fromLabel && looksLikeCompany(fromLabel)) return fromLabel;
    const txt = cleanText(labelled.textContent);
    if (looksLikeCompany(txt)) return txt;
  }
  return undefined;
}

function extractConnections(): string | undefined {
  const text = visibleTextFrom(profileMainRoot());
  const match = text.match(/([\d][\d,.+]*)\s*connections?\b/i);
  return match ? cleanText(match[0]) : undefined;
}

// LinkedIn's activity preview is one big blob: profile header, follower counts,
// "Posts Comments Articles" tabs, then each post prefixed with a time marker
// ("19h •", "1w •") and trailed by reaction counts, "…more", and hashtags. We
// strip all of that and keep a short, readable gist per post.
const POST_TIME_MARKER = /\b\d+\s*(?:h|d|w|mo|m|y|yr)\b\s*[•·]/i;

function cleanPostGist(raw: string, name: string): string {
  let t = cleanText(raw);
  t = t.replace(/^(?:reposted this|reposted|posted this|posted|commented on this|commented|shared this|shared|likes this|celebrates)\b/i, "");
  t = t.replace(/^\s*\d+\s*(?:h|d|w|mo|m|y|yr)\b\s*[•·-]?\s*/i, ""); // leading "1w •"
  if (name) {
    t = t.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }
  t = t.replace(/\s*(?:…|\.\.\.)\s*more\b/gi, " ").replace(/\bsee more\b/gi, " ");
  t = t.replace(/\b\d[\d,]*\s*(?:followers?|connections?|reactions?|comments?|likes?|reposts?|impressions?)\b/gi, " ");
  t = t.replace(/\b(posts|comments|articles)\b/gi, " ");
  t = t.replace(/#[A-Za-z0-9_]+/g, " "); // hashtags add noise
  // After the post body LinkedIn appends an engagement/badge cluster: a carousel
  // counter ("1/4"), and a tagged connection's degree + Premium badge
  // ("• 3rd+ Prime"). Cut the gist at the first such marker — everything after
  // is chrome, not content. (Guard on >= 40 so we never truncate to nothing if
  // a number/degree legitimately appears early in short prose.)
  const metaBoundary = t.search(/\b\d+\s*\/\s*\d+\b|[·•|]\s*(?:1st|2nd|3rd)\+?\b|\b(?:1st|2nd|3rd)\+?\s+(?:degree|connections?)\b/i);
  if (metaBoundary >= 40) {
    t = t.slice(0, metaBoundary);
  }
  // Bare reaction/comment/repost counts trail the body as runs of numbers with
  // no unit word ("26,822 743 662"); strip a trailing run of 2+ such groups.
  t = t.replace(/(?:\s+\d[\d,.]*){2,}\s*$/, " ");
  t = cleanText(t);
  const firstSentence = t.split(/(?<=[.!?])\s/)[0] ?? t;
  return cleanText((firstSentence.length >= 40 ? firstSentence : t).slice(0, 220));
}

function extractActivity(name: string): { text: string; date?: string }[] {
  const activityText = textNearHeading(/^(activity|posts)\b/i);
  if (!activityText) {
    return [];
  }

  // Drop everything before the first post (the profile/follower header).
  const firstPost = activityText.search(POST_TIME_MARKER);
  const body = firstPost >= 0 ? activityText.slice(firstPost) : activityText.replace(/^(activity|posts)\s*/i, "");

  const gists: { text: string }[] = [];
  const seen = new Set<string>();
  for (const chunk of body.split(new RegExp(`(?=${POST_TIME_MARKER.source})`, "i"))) {
    const gist = cleanPostGist(chunk, name);
    const key = gist.toLowerCase();
    if (gist.length > 25 && !seen.has(key)) {
      seen.add(key);
      gists.push({ text: gist });
    }
    if (gists.length >= 6) break;
  }
  return gists;
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

function extractPhotoUrl(name: string): string | undefined {
  const root = profileMainRoot();
  const firstName = name.split(/\s+/)[0] ?? "";

  const candidates: HTMLImageElement[] = [
    ...Array.from(root.querySelectorAll<HTMLImageElement>("img.pv-top-card-profile-picture__image")),
    ...Array.from(root.querySelectorAll<HTMLImageElement>("img.profile-photo-edit__preview")),
    ...Array.from(root.querySelectorAll<HTMLImageElement>('img[width="200"], img[width="100"]')),
    ...Array.from(root.querySelectorAll<HTMLImageElement>("img"))
  ];

  for (const img of candidates) {
    const src = img.currentSrc || img.src || "";
    if (!src || !/^https?:/i.test(src) || src.startsWith("data:")) {
      continue;
    }
    // LinkedIn member photos are served from licdn profile-displayphoto paths.
    const isMemberPhoto = /licdn\.com/i.test(src) && /(profile-displayphoto|profile-framedphoto)/i.test(src);
    const altMatchesName = firstName && new RegExp(firstName.replace(/[^a-z]/gi, ""), "i").test(img.alt || "");
    if (isMemberPhoto || altMatchesName) {
      return src;
    }
  }
  return undefined;
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
  const projects = extractProjects();
  const roleCompany = splitRoleCompany(headline);
  const currentFromExperience = experience[0] ? { role: experience[0].title, company: experience[0].company } : {};
  const resolvedCompany =
    [currentFromExperience.company, extractCurrentCompanyTopCard(), roleCompany.company].find((c) => c && looksLikeCompany(c)) || undefined;
  const rawRole = roleCompany.role || currentFromExperience.role;
  const currentRole = rawRole ? stripConnectionDegree(rawRole) || undefined : undefined;
  const about = textNearHeading(/^about\b/i).replace(/^about\s*/i, "").slice(0, 1500);
  // Keyword-skill scanning must see only the target's own words, not the page.
  const ownSkillCorpus = [
    headline,
    about,
    experience.map((item) => `${item.title} ${item.description ?? ""}`).join(" ")
  ]
    .filter(Boolean)
    .join(" ");
  const profileWithoutConfidence: Omit<LinkedInProfile, "extractionConfidence"> = {
    source: "linkedin",
    url: window.location.href,
    extractedAt: new Date().toISOString(),
    name,
    headline,
    photoUrl: extractPhotoUrl(name),
    location: extractLocation(),
    currentRole,
    currentCompany: resolvedCompany,
    about,
    experience,
    education,
    certifications,
    projects,
    skills: extractSkills(ownSkillCorpus),
    activity: extractActivity(name),
    followers: extractFollowers(),
    connections: extractConnections(),
    rawTextSample: [
      visibleTextFrom(profileMainRoot()).slice(0, 4000),
      education.length ? `Education: ${education.join(" | ")}` : "",
      projects.length ? `Projects: ${projects.join(" | ")}` : "",
      certifications.length ? `Certifications: ${certifications.join(" | ")}` : ""
    ].filter(Boolean).join(" | ")
  };

  return {
    ...profileWithoutConfidence,
    extractionConfidence: confidenceFor(profileWithoutConfidence)
  };
}
