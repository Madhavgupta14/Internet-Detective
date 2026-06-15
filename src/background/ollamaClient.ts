import { DEFAULT_SETTINGS, HOSTED_MODEL } from "../shared/constants";
import type { AppSettings, LlmInsight, LlmProfileAssessment, LlmScore, LinkedInProfile, LinkedInScores, LinkedInSignals } from "../shared/types";
import { buildLinkedInInsightPrompt, buildProfileOutreachPrompt } from "../intelligence/prompts/linkedinPrompts";

type OllamaGenerateResponse = {
  response?: string;
  error?: string;
};

type OllamaTagsResponse = {
  models?: Array<{ name: string }>;
};

type HostedResponse = {
  response?: string;
  error?: string;
  model?: string;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "") || DEFAULT_SETTINGS.ollamaUrl;
}

function hostedAnalyzeUrl(settings: AppSettings): string {
  return `${normalizeBaseUrl(settings.apiEndpoint)}/api/analyze`;
}

function hostedHealthUrl(settings: AppSettings): string {
  return `${normalizeBaseUrl(settings.apiEndpoint)}/api/health`;
}

function isHosted(settings: AppSettings): boolean {
  return settings.backend === "hosted";
}

async function fetchOllama(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Cannot reach Ollama at the configured endpoint. Start Ollama, then check Settings > Ollama endpoint.");
    }
    throw error;
  }
}

// Calls the hosted Groq proxy and returns the raw model text (a JSON string).
async function generateHosted(
  prompt: string,
  settings: AppSettings,
  options: { temperature: number; maxTokens: number }
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(hostedAnalyzeUrl(settings), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        model: HOSTED_MODEL
      })
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Cannot reach the analysis service. Check your internet connection or the API endpoint in Settings.");
    }
    throw error;
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as HostedResponse;
      detail = body.error ?? "";
    } catch {
      detail = "";
    }
    throw new Error(`Analysis service returned HTTP ${response.status}${detail ? `: ${detail}` : ""}.`);
  }

  const data = (await response.json()) as HostedResponse;
  if (data.error) {
    throw new Error(data.error);
  }
  return data.response ?? "";
}

// Calls local Ollama and returns the raw model text (a JSON string).
async function generateOllama(
  prompt: string,
  settings: AppSettings,
  options: { temperature: number; topP: number; numPredict: number }
): Promise<string> {
  const response = await fetchOllama(`${normalizeBaseUrl(settings.ollamaUrl)}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model,
      prompt: `/no_think\n${prompt}`,
      format: "json",
      stream: false,
      options: {
        temperature: options.temperature,
        top_p: options.topP,
        num_predict: options.numPredict
      }
    })
  });

  await assertOllamaResponse(response);

  const data = (await response.json()) as OllamaGenerateResponse;
  if (data.error) {
    throw new Error(data.error);
  }
  return data.response ?? "";
}

// Backend-agnostic generation entry point.
async function generateRaw(
  prompt: string,
  settings: AppSettings,
  options: { temperature: number; maxTokens: number }
): Promise<string> {
  if (isHosted(settings)) {
    return generateHosted(prompt, settings, { temperature: options.temperature, maxTokens: options.maxTokens });
  }
  return generateOllama(prompt, settings, {
    temperature: options.temperature,
    topP: 0.9,
    numPredict: options.maxTokens
  });
}

function activeModelLabel(settings: AppSettings): string {
  return isHosted(settings) ? HOSTED_MODEL : settings.model;
}

function extensionOrigin(): string {
  return typeof chrome !== "undefined" && chrome.runtime?.id ? `chrome-extension://${chrome.runtime.id}` : "chrome-extension://<your-extension-id>";
}

async function assertOllamaResponse(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  let detail = "";
  try {
    detail = (await response.text()).trim();
  } catch {
    detail = "";
  }

  if (response.status === 403) {
    throw new Error(
      `Ollama blocked this extension origin. Add ${extensionOrigin()} to OLLAMA_ORIGINS, restart Ollama, then try again.`
    );
  }

  throw new Error(`Ollama returned HTTP ${response.status}${detail ? `: ${detail}` : ""}.`);
}

// Pulls the first balanced-ish JSON object out of a model response, tolerating
// code fences and surrounding prose.
function firstJsonObject(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("The model response did not contain JSON.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.round(Math.min(100, Math.max(0, n)));
}

function parseLlmScore(raw: unknown): LlmScore {
  if (raw && typeof raw === "object") {
    const obj = raw as { score?: unknown; reason?: unknown };
    return {
      score: clampScore(obj.score),
      reason: typeof obj.reason === "string" ? obj.reason.trim().slice(0, 240) : ""
    };
  }
  // Some models emit a bare number instead of { score, reason }.
  return { score: clampScore(raw), reason: "" };
}

// Reads the optional "analysis" block the insight prompt asks for. Returns
// undefined when absent or unusable so callers fall back to keyword scores.
function parseAssessment(parsed: Record<string, unknown>): LlmProfileAssessment | undefined {
  const analysis = parsed.analysis;
  if (!analysis || typeof analysis !== "object") {
    return undefined;
  }
  const obj = analysis as Record<string, unknown>;
  if (!("decisionMaker" in obj) && !("founder" in obj) && !("hiringIntent" in obj)) {
    return undefined;
  }
  const skills = Array.isArray(obj.skills)
    ? obj.skills.map((skill) => (typeof skill === "string" ? skill.trim() : "")).filter(Boolean).slice(0, 20)
    : [];
  return {
    decisionMaker: parseLlmScore(obj.decisionMaker),
    founder: parseLlmScore(obj.founder),
    hiringIntent: parseLlmScore(obj.hiringIntent),
    skills,
    confidence: clampScore(obj.confidence)
  };
}

function parseJsonResponse(text: string): { summary: string; outreach: LlmInsight["outreach"] } {
  const parsed = firstJsonObject(text) as {
    summary?: string;
    outreach?: Partial<LlmInsight["outreach"]>;
  };

  // Remove leftover template placeholders the model may emit.
  const stripPlaceholders = (value: string): string =>
    value
      .replace(/\[[^\]\n]{0,48}\]/g, "")
      .replace(/\{\{?[^}\n]{0,48}\}?\}/g, "")
      .replace(/\bplaceholder\b/gi, "")
      .replace(/[ \t]+([,.!?;:])/g, "$1")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\(\s*\)/g, "")
      .trim();

  const base = (value: string | undefined): string =>
    stripPlaceholders((value ?? "").replace(/\r\n/g, "\n").trim());

  const summary = base(parsed.summary) || "The model returned no usable summary.";

  // Email keeps line breaks; ensure a Subject line exists.
  let emailOpener = base(parsed.outreach?.emailOpener);
  if (emailOpener && !/^subject:/im.test(emailOpener)) {
    emailOpener = `Subject: Quick note\n\n${emailOpener}`;
  }
  emailOpener = emailOpener || "Visible profile data was insufficient for a personalized email.";

  // Connection request: single line, hard cap for LinkedIn's note limit.
  let connectionRequest = base(parsed.outreach?.connectionRequest).replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  const LIMIT = 300;
  if (connectionRequest.length > LIMIT) {
    const cut = connectionRequest.slice(0, LIMIT);
    const lastSpace = cut.lastIndexOf(" ");
    connectionRequest = `${cut.slice(0, lastSpace > 220 ? lastSpace : LIMIT).trim().replace(/[,;:\-]$/, "")}…`;
  }
  connectionRequest = connectionRequest || "Visible profile data was insufficient for a personalized connection request.";

  // Icebreaker: a single concise line.
  const icebreaker = base(parsed.outreach?.icebreaker).replace(/\s*\n+\s*/g, " ").trim() || "Visible profile data was insufficient for a specific icebreaker.";

  return {
    summary,
    outreach: {
      emailOpener,
      connectionRequest,
      icebreaker
    }
  };
}

export async function checkOllama(settings: AppSettings): Promise<{ available: boolean; models: string[] }> {
  if (isHosted(settings)) {
    let response: Response;
    try {
      response = await fetch(hostedHealthUrl(settings));
    } catch {
      throw new Error("Cannot reach the analysis service. Check your internet connection or the API endpoint in Settings.");
    }
    if (!response.ok) {
      throw new Error(`Analysis service returned HTTP ${response.status}.`);
    }
    const data = (await response.json()) as { ok?: boolean; hasKey?: boolean; model?: string };
    if (!data.hasKey) {
      throw new Error("Analysis service is reachable but missing its API key. Contact support.");
    }
    return { available: Boolean(data.ok), models: [data.model ?? HOSTED_MODEL] };
  }

  const response = await fetchOllama(`${normalizeBaseUrl(settings.ollamaUrl)}/api/tags`);
  await assertOllamaResponse(response);

  const data = (await response.json()) as OllamaTagsResponse;
  return {
    available: true,
    models: data.models?.map((model) => model.name) ?? []
  };
}

export async function generateLinkedInInsight(
  profile: LinkedInProfile,
  signals: LinkedInSignals,
  scores: LinkedInScores,
  settings: AppSettings
): Promise<{ insight: LlmInsight; assessment?: LlmProfileAssessment }> {
  const prompt = buildLinkedInInsightPrompt(profile, signals, scores, settings.senderName || undefined, settings.senderRole || undefined);
  const raw = await generateRaw(prompt, settings, { temperature: 0.2, maxTokens: 1200 });
  const parsed = parseJsonResponse(raw);
  let assessment: LlmProfileAssessment | undefined;
  try {
    assessment = parseAssessment(firstJsonObject(raw));
  } catch {
    assessment = undefined;
  }
  return {
    insight: {
      summary: parsed.summary,
      outreach: parsed.outreach,
      model: activeModelLabel(settings),
      generatedAt: new Date().toISOString()
    },
    assessment
  };
}

export async function generateProfileOutreach({
  profile,
  signals,
  scores,
  settings,
  resumeName,
  resumeText,
  contextPrompt
}: {
  profile: LinkedInProfile;
  signals: LinkedInSignals;
  scores: LinkedInScores;
  settings: AppSettings;
  resumeName?: string;
  resumeText: string;
  contextPrompt: string;
}): Promise<LlmInsight> {
  const prompt = buildProfileOutreachPrompt({
    profile,
    signals,
    scores,
    resumeName,
    resumeText: resumeText.slice(0, 6500),
    contextPrompt,
    senderName: settings.senderName || undefined,
    senderRole: settings.senderRole || undefined
  });
  const raw = await generateRaw(prompt, settings, { temperature: 0.25, maxTokens: 1200 });
  const parsed = parseJsonResponse(raw);
  return {
    summary: parsed.summary,
    outreach: parsed.outreach,
    model: `${activeModelLabel(settings)} + resume`,
    generatedAt: new Date().toISOString()
  };
}
