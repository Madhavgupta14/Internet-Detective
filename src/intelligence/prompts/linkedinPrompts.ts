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
    projects: profile.projects.slice(0, 6),
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

Use only the provided structured profile. Do not invent facts. If evidence is weak, say so plainly.

${senderLine}

You have two jobs: (A) score the profile, and (B) write outreach.

== A. Scoring ==
Assess the person from the profile alone and assign three integer scores from 0 to 100. The "Heuristic hints" block below is a rough keyword-based guess that is OFTEN WRONG for non-corporate roles (politicians, doctors, academics, artists, public figures) — treat it as a weak hint only and rely on your own judgment of the actual role, seniority, and evidence.

Rubric:
- decisionMaker: authority to make or strongly influence decisions in their domain — budget, hiring, strategy, org leadership, or public office. HIGH for founders, C-level/VP/director, partners, senior public officials (e.g. a head of government or minister), and widely-followed leaders. LOW for students, junior individual contributors, and people with no visible authority.
- founder: likelihood the person founded, owns, or runs a company or venture. HIGH only with founder/owner/entrepreneur evidence in role, about, or experience. A senior employee who did not found anything is LOW.
- hiringIntent: visible evidence the person is hiring or growing a team RIGHT NOW — active hiring posts, open roles, "we're hiring", recruiting language. Being senior does NOT imply hiring. With no hiring evidence, keep this LOW.

Also derive "skills": the person's genuine professional skills and domains, inferred from THEIR role, experience, about, and posts. Do not output generic technology buzzwords that are not supported by the profile, and never attribute skills that belong to other people. Return an empty array if the profile does not support any.

Set "confidence" (0-100) for how much visible evidence supported your scoring.

== B. Outreach ==
- For outreach, prioritize visible hiring scope and skills.
- If there is no hiring evidence, do not imply that the person is hiring.
- NEVER use placeholders: no [Your Name], [Name], [Your Role], [Your Company], [Position], [Company], bracketed text, or "your work/team/company/current work".
- Do not mention profile data that is not present in the JSON.
- Keep outreach natural, specific, and ready to paste into email or LinkedIn.
- Personalize using the strongest available anchors: name, current role, current company, about text, recent activity.
- Avoid generic compliments. Tie the reason for reaching out to one specific visible profile detail.
- If visible evidence is thin, keep the message brief and honest rather than inventing context.

Return strict JSON with this shape:
{
  "analysis": {
    "decisionMaker": { "score": 0, "reason": "one or two plain-English sentences a non-expert can read, citing the specific profile evidence behind the score" },
    "founder": { "score": 0, "reason": "one or two plain-English sentences citing specific evidence" },
    "hiringIntent": { "score": 0, "reason": "one or two plain-English sentences citing specific evidence" },
    "skills": ["specific skill or domain", "..."],
    "confidence": 0
  },
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

Profile (your source of truth):
${JSON.stringify(compactProfile(profile), null, 2)}

Heuristic hints (keyword-based, may be wrong — do not trust blindly):
${JSON.stringify({ ...compactSignals(signals), keywordScores: scores }, null, 2)}`;
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
