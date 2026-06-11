import { DEFAULT_SETTINGS } from "../shared/constants";
import type { AppSettings, LlmInsight, LinkedInProfile, LinkedInScores, LinkedInSignals } from "../shared/types";
import { buildLinkedInInsightPrompt, buildProfileOutreachPrompt } from "../intelligence/prompts/linkedinPrompts";

type OllamaGenerateResponse = {
  response?: string;
  error?: string;
};

type OllamaTagsResponse = {
  models?: Array<{ name: string }>;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "") || DEFAULT_SETTINGS.ollamaUrl;
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

function parseJsonResponse(text: string): { summary: string; outreach: LlmInsight["outreach"] } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Ollama response did not contain JSON.");
  }

  const parsed = JSON.parse(candidate.slice(start, end + 1)) as {
    summary?: string;
    outreach?: Partial<LlmInsight["outreach"]>;
  };

  const sanitize = (value: string | undefined, fallback: string) => {
    const clean = (value ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
    if (!clean || /\byour (?:work|team|company|current work)\b/i.test(clean)) {
      return fallback;
    }
    return clean;
  };

  return {
    summary: sanitize(parsed.summary, "The local model returned no usable summary."),
    outreach: {
      emailOpener: sanitize(parsed.outreach?.emailOpener, "Visible profile data was insufficient for a personalized email."),
      connectionRequest: sanitize(parsed.outreach?.connectionRequest, "Visible profile data was insufficient for a personalized connection request."),
      icebreaker: sanitize(parsed.outreach?.icebreaker, "Visible profile data was insufficient for a specific icebreaker.")
    }
  };
}

export async function checkOllama(settings: AppSettings): Promise<{ available: boolean; models: string[] }> {
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
): Promise<LlmInsight> {
  const prompt = buildLinkedInInsightPrompt(profile, signals, scores);
  const response = await fetchOllama(`${normalizeBaseUrl(settings.ollamaUrl)}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model,
      prompt,
      format: "json",
      stream: false,
      options: {
        temperature: 0.2,
        top_p: 0.8,
        num_predict: 450
      }
    })
  });

  await assertOllamaResponse(response);

  const data = (await response.json()) as OllamaGenerateResponse;
  if (data.error) {
    throw new Error(data.error);
  }

  const parsed = parseJsonResponse(data.response ?? "");
  return {
    summary: parsed.summary,
    outreach: parsed.outreach,
    model: settings.model,
    generatedAt: new Date().toISOString()
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
    contextPrompt
  });
  const response = await fetchOllama(`${normalizeBaseUrl(settings.ollamaUrl)}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model,
      prompt,
      format: "json",
      stream: false,
      options: {
        temperature: 0.25,
        top_p: 0.85,
        num_predict: 700
      }
    })
  });

  await assertOllamaResponse(response);

  const data = (await response.json()) as OllamaGenerateResponse;
  if (data.error) {
    throw new Error(data.error);
  }

  const parsed = parseJsonResponse(data.response ?? "");
  return {
    summary: parsed.summary,
    outreach: parsed.outreach,
    model: `${settings.model} + resume`,
    generatedAt: new Date().toISOString()
  };
}
