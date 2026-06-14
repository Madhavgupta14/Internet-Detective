import type { LinkedInProfile, LinkedInScores, LinkedInSignals, LlmInsight } from "../../shared/types";

function firstName(name: string): string {
  return name.split(/\s+/)[0] || "there";
}

function roleLine(profile: LinkedInProfile): string {
  if (profile.currentRole && profile.currentCompany) {
    return `${profile.currentRole} at ${profile.currentCompany}`;
  }
  return profile.headline || profile.currentRole || "";
}

function sentenceList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function strongestScore(scores: LinkedInScores): string {
  const entries = [
    ["decision-maker", scores.decisionMaker.value],
    ["founder", scores.founder.value],
    ["hiring-intent", scores.hiringIntent.value]
  ] as const;
  return [...entries].sort((a, b) => b[1] - a[1])[0][0];
}

function cleanSubjectPart(value: string): string {
  return value.replace(/[^\w\s&.-]/g, "").replace(/\s+/g, " ").trim().slice(0, 70);
}

function strongestAnchor(profile: LinkedInProfile, signals: LinkedInSignals): string {
  const hiringScope = sentenceList(signals.hiringScope.slice(0, 2));
  const skills = sentenceList(signals.skillSignals.slice(0, 3));
  const about = profile.about?.split(/[.!?]/)[0]?.trim();
  return hiringScope || skills || about || roleLine(profile);
}

function limitText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}.`;
}

export function buildFallbackInsight(profile: LinkedInProfile, scores: LinkedInScores, signals: LinkedInSignals): LlmInsight {
  const name = firstName(profile.name);
  const role = roleLine(profile);
  const strongest = strongestScore(scores);
  const company = profile.currentCompany || "";
  const hiringScope = signals.hiringScope.slice(0, 2);
  const skills = signals.skillSignals.slice(0, 3);
  const topic = strongestAnchor(profile, signals);
  const hasSpecificAnchor = Boolean(topic || role || company);
  const subjectPart = cleanSubjectPart(hiringScope[0] || skills[0] || company || profile.currentRole || "your LinkedIn profile");
  const summaryContext =
    hiringScope.length > 0
      ? `Visible hiring scope: ${sentenceList(hiringScope)}. Skill signals: ${sentenceList(skills) || "none extracted"}.`
      : skills.length > 0
        ? `No explicit hiring scope was extracted. Visible skill signals: ${sentenceList(skills)}.`
        : "No explicit hiring scope or skill requirements were extracted from the visible profile text.";
  const anchorLine =
    hiringScope.length > 0
      ? `I noticed your profile mentions hiring around ${sentenceList(hiringScope)}${skills.length > 0 ? `, with signals around ${sentenceList(skills)}` : ""}.`
      : topic
        ? `I noticed your profile points to ${topic}${company ? ` at ${company}` : ""}.`
        : "";
  const fitLine =
    hiringScope.length > 0
      ? "That looks like a timely reason to compare notes on hiring priorities and the kind of profiles that would be useful."
      : "That seemed like a relevant reason to connect and learn more about what you are focused on right now.";

  return {
    model: "Local template",
    generatedAt: new Date().toISOString(),
    summary: `Spectra calculated these scores locally from visible LinkedIn profile signals. The strongest current signal is ${strongest}. ${summaryContext} Verify fit before outreach when evidence is limited.`,
    outreach: {
      emailOpener: hasSpecificAnchor
        ? `Subject: Quick note on ${subjectPart}\n\nHi ${name},\n\n${anchorLine}\n\n${fitLine} Open to a brief conversation this week?`
        : "Visible profile data did not include enough role, hiring, or skill detail for a personalized email.",
      connectionRequest: hasSpecificAnchor
        ? limitText(`Hi ${name}, I came across your profile${topic ? ` and noticed ${topic}` : ""}. Would be glad to connect.`, 260)
        : "Visible profile data did not include enough hiring or skill detail for a personalized connection request.",
      icebreaker: hasSpecificAnchor
        ? hiringScope.length > 0
          ? `Your profile shows hiring context around ${sentenceList(hiringScope)}, which gives a concrete angle for a focused conversation${company ? ` with ${company}` : ""}.`
          : `Your profile points to ${topic || role}, which gives a concrete angle for a focused conversation${company ? ` with ${company}` : ""}.`
        : "Visible profile data did not include enough evidence for a specific icebreaker."
    }
  };
}
