import type { LinkedInProfile, LinkedInScores, LinkedInSignals } from "../../shared/types";

function compactProfile(profile: LinkedInProfile) {
  return {
    name: profile.name,
    headline: profile.headline,
    location: profile.location,
    currentRole: profile.currentRole,
    currentCompany: profile.currentCompany,
    about: profile.about?.slice(0, 500),
    experience: profile.experience.slice(0, 3).map((item) => ({
      title: item.title,
      company: item.company,
      duration: item.duration,
      description: item.description?.slice(0, 260)
    })),
    skills: profile.skills.slice(0, 12),
    recentActivity: profile.activity.slice(0, 2).map((item) => item.text.slice(0, 240))
  };
}

function compactSignals(signals: LinkedInSignals) {
  return {
    hiringScope: signals.hiringScope,
    skillSignals: signals.skillSignals,
    evidence: signals.evidence.slice(0, 6)
  };
}

function compactResume(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .slice(0, 6500)
    .trim();
}

export function buildLinkedInInsightPrompt(
  profile: LinkedInProfile,
  signals: LinkedInSignals,
  scores: LinkedInScores
): string {
  return `You are Internet Detective, a privacy-first browser intelligence assistant.

Use only the provided structured profile, signal evidence, and scores. Do not invent facts. If evidence is weak, say so plainly.

Primary task:
- Explain decision-maker, founder, and hiring intent in relation to the visible evidence.
- For outreach, prioritize visible hiring scope and skillSignals.
- If hiringScope is empty, do not imply that the person is hiring. You may reference visible skills or current role only.
- Never use placeholders such as "your work", "your team", "your company", "current work", or "there" except as a greeting fallback.
- Do not mention profile data that is not present in the JSON.
- Keep outreach natural, specific, and ready to paste into email or LinkedIn.
- Personalize using the strongest available anchors in this order: name, current role, current company, about text, hiring scope, skill signals, recent activity.
- Avoid generic compliments. Tie the reason for reaching out to one visible profile detail.
- If the visible evidence is thin, keep the message brief and honest instead of inventing context.

Return strict JSON with this shape:
{
  "summary": "2-4 concise sentences. Start with the strongest signal, mention the useful evidence, and include a confidence caveat when evidence is limited.",
  "outreach": {
    "emailOpener": "a complete short cold email in 3-5 lines, with a subject line, greeting, specific profile anchor, reason to connect, and soft CTA",
    "connectionRequest": "one personalized LinkedIn connection request under 260 characters with no line breaks",
    "icebreaker": "one short opener that references a visible role, company, hiring scope, skill, about text, or activity item"
  }
}

Formatting rules:
- emailOpener may include line breaks and must be paste-ready.
- connectionRequest must stay under 260 characters.
- icebreaker must be one concise sentence.
- Do not use markdown, bullets, brackets, placeholders, or labels except "Subject:" inside emailOpener.
- If there is not enough visible role, hiring, or skill evidence for a field, say the visible profile data is insufficient for that field.

Profile:
${JSON.stringify(compactProfile(profile), null, 2)}

Signals:
${JSON.stringify(compactSignals(signals), null, 2)}

Scores:
${JSON.stringify(scores, null, 2)}`;
}

export function buildProfileOutreachPrompt({
  profile,
  signals,
  scores,
  resumeName,
  resumeText,
  contextPrompt
}: {
  profile: LinkedInProfile;
  signals: LinkedInSignals;
  scores: LinkedInScores;
  resumeName?: string;
  resumeText: string;
  contextPrompt: string;
}): string {
  return `You are Internet Detective, a privacy-first browser intelligence assistant.

Use the LinkedIn target profile, extracted signals, user resume text, and user outreach context to create paste-ready outreach. The resume belongs to the sender, not the LinkedIn target.

Primary task:
- Parse the resume text into the sender's most relevant profile: role, experience, skills, achievements, domain strengths, and credible fit.
- Use the user's outreach context as the intent, for example hiring, pitching, partnership, recruiting, sales, or any custom goal.
- Match sender strengths from the resume to visible target profile evidence.
- Do not invent facts about the sender or target.
- Do not claim the target is hiring unless hiringScope or visible profile evidence supports it, or the user's context clearly says they are applying to a known opening.
- Never use placeholders such as "your work", "your team", "your company", "current work", or bracketed text.
- Keep the copy specific, natural, concise, and ready to paste.

Return strict JSON with this shape:
{
  "summary": "2-4 concise sentences explaining the best outreach angle, sender fit from the resume, target evidence, and any caveat.",
  "outreach": {
    "emailOpener": "a complete short cold email in 4-7 lines, with a subject line, greeting, profile anchor, sender-fit line, reason to connect, and soft CTA",
    "connectionRequest": "one personalized LinkedIn connection request under 260 characters with no line breaks",
    "icebreaker": "one short opener that references a visible target detail and a relevant sender strength"
  }
}

Formatting rules:
- emailOpener may include line breaks and must be paste-ready.
- connectionRequest must stay under 260 characters.
- icebreaker must be one concise sentence.
- Do not use markdown, bullets, brackets, placeholders, or labels except "Subject:" inside emailOpener.
- If the resume or target evidence is too thin for a field, say what is insufficient plainly.

User outreach context:
${contextPrompt.trim() || "No custom context provided. Generate a professional introductory outreach message."}

Resume file:
${resumeName || "Uploaded resume"}

Resume text:
${compactResume(resumeText)}

Target LinkedIn profile:
${JSON.stringify(compactProfile(profile), null, 2)}

Target signals:
${JSON.stringify(compactSignals(signals), null, 2)}

Target scores:
${JSON.stringify(scores, null, 2)}`;
}
