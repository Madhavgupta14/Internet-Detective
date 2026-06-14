import type { LinkedInProfile, LinkedInScores, LinkedInSignals } from "../../shared/types";

function compactProfile(profile: LinkedInProfile) {
  const [current, ...previous] = profile.experience;
  return {
    name: profile.name,
    headline: profile.headline,
    location: profile.location,
    followers: profile.followers,
    connections: profile.connections,
    currentRole: profile.currentRole,
    currentCompany: profile.currentCompany,
    about: profile.about?.slice(0, 800),
    currentExperience: current
      ? {
          title: current.title,
          company: current.company,
          duration: current.duration,
          description: current.description?.slice(0, 400)
        }
      : undefined,
    previousRoles: previous.slice(0, 6).map((item) => ({
      title: item.title,
      company: item.company,
      duration: item.duration,
      description: item.description?.slice(0, 240)
    })),
    education: profile.education.slice(0, 5),
    certifications: profile.certifications.slice(0, 6),
    skills: profile.skills.slice(0, 20),
    recentActivity: profile.activity.slice(0, 5).map((item) => item.text.slice(0, 360))
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
  scores: LinkedInScores,
  senderName?: string,
  senderRole?: string
): string {
  const senderLine = senderName
    ? `Sender: ${senderName}${senderRole ? `, ${senderRole}` : ""}`
    : "Sender: unknown — write outreach in first person but do NOT use any placeholder like [Your Name], [Name], [Your Role], or [Your Company]. Sign off with a generic but professional closing like 'Best regards' with no name.";

  return `You are Spectra, a browser intelligence assistant.

Use only the provided structured profile, signal evidence, and scores. Do not invent facts. If evidence is weak, say so plainly.

${senderLine}

Primary task:
- Explain decision-maker, founder, and hiring intent in relation to the visible evidence.
- For outreach, prioritize visible hiring scope and skillSignals.
- If hiringScope is empty, do not imply that the person is hiring.
- NEVER use placeholders: no [Your Name], [Name], [Your Role], [Your Company], [Position], [Company], bracketed text, or "your work/team/company/current work".
- Do not mention profile data that is not present in the JSON.
- Keep outreach natural, specific, and ready to paste into email or LinkedIn.
- Personalize using the strongest available anchors: name, current role, current company, about text, hiring scope, skill signals, recent activity.
- Avoid generic compliments. Tie the reason for reaching out to one specific visible profile detail.
- If visible evidence is thin, keep the message brief and honest rather than inventing context.

Return strict JSON with this shape:
{
  "summary": "2-4 concise sentences. Start with the strongest signal, mention useful evidence, include a confidence caveat when evidence is limited.",
  "outreach": {
    "emailOpener": "a complete short cold email in 3-5 lines, with a subject line on its own line starting with Subject:, a greeting using the target's first name, one specific profile anchor, one clear reason to connect, and a soft CTA. Sign off with the sender name if known.",
    "connectionRequest": "one personalized LinkedIn connection request under 260 characters with no line breaks. Reference one specific detail from the profile.",
    "icebreaker": "one short opener sentence referencing a visible role, company, skill, or activity item from the profile"
  }
}

Formatting rules:
- emailOpener must include line breaks and be paste-ready with no placeholders.
- connectionRequest must stay under 260 characters.
- icebreaker must be one concise sentence.
- Do not use markdown, bullets, or labels except "Subject:" inside emailOpener.
- If there is not enough evidence for a field, say the visible profile data is insufficient — do not invent or use placeholders.

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
  contextPrompt,
  senderName,
  senderRole
}: {
  profile: LinkedInProfile;
  signals: LinkedInSignals;
  scores: LinkedInScores;
  resumeName?: string;
  resumeText: string;
  contextPrompt: string;
  senderName?: string;
  senderRole?: string;
}): string {
  const senderIdentity = senderName
    ? `Sender identity (use for signatures and the sender voice):
- Name: ${senderName}${senderRole ? `\n- Role: ${senderRole}` : ""}
Sign off emails with the sender's real name. Never write "[Your Name]" or any bracketed placeholder.`
    : `If the resume reveals the sender's name, use it to sign off. If no name is available, end without a signature line. Never write "[Your Name]" or any bracketed placeholder.`;

  return `You are Spectra, a browser intelligence assistant.

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

${senderIdentity}

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
