import { extractLinkedInSignals } from "../intelligence/signals/linkedinSignals";
import { scoreLinkedInProfile } from "../intelligence/scoring/linkedinScores";
import { buildFallbackInsight } from "../intelligence/prompts/fallbackInsight";
import { checkOllama, generateLinkedInInsight, generateProfileOutreach } from "./ollamaClient";
import { fetchAccountCredits, findEmailsForAnalysis } from "./emailFinder";
import { getAccessToken, getCurrentUser, signIn, signOut } from "./auth";
import { deleteAllData, getLatestAnalysis, getOutreachPreferences, getSettings, saveAnalysis, saveOutreachPreferences, saveSettings } from "../storage/db";
import type {
  AppMessage,
  AppSettings,
  AuthState,
  GenerateProfileOutreachMessage,
  LinkedInAnalysis,
  LinkedInProfile,
  MessageResponse,
  OutreachPreferences,
  ResumePayload
} from "../shared/types";

async function buildAuthState(settings: AppSettings, token?: string | null): Promise<AuthState> {
  const usingOwnKey = Boolean(settings.hunterApiKey?.trim());
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, usingOwnKey };
  }
  if (usingOwnKey) {
    return { user, usingOwnKey };
  }
  const activeToken = token ?? (await getAccessToken(false));
  if (!activeToken) {
    return { user, usingOwnKey };
  }
  const credits = await fetchAccountCredits(settings.apiEndpoint, activeToken);
  return { user, usingOwnKey, usesRemaining: credits.usesRemaining, freeLimit: credits.freeLimit };
}

function createId(): string {
  return `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }
  return tab;
}

function sendTabMessage<T>(tabId: number, message: AppMessage): Promise<MessageResponse<T>> {
  return chrome.tabs.sendMessage(tabId, message);
}

function isLinkedInProfileUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith("linkedin.com") && /^\/in\/[^/]+\/?/.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isMissingReceiverError(error: unknown): boolean {
  return error instanceof Error && /Receiving end does not exist|Could not establish connection/i.test(error.message);
}

async function extractFromTab(tab: chrome.tabs.Tab): Promise<LinkedInProfile> {
  if (!tab.id) {
    throw new Error("No active tab found.");
  }

  if (!isLinkedInProfileUrl(tab.url)) {
    throw new Error("Open a LinkedIn profile page before running analysis.");
  }

  // The manifest already injects content.js as a content script. Only inject
  // programmatically when the receiver is missing (e.g. tab opened before install),
  // otherwise a second injection re-runs the bundle and throws a redeclaration error.
  try {
    const extraction = await sendTabMessage<LinkedInProfile>(tab.id, { type: "EXTRACT_LINKEDIN_PROFILE" });
    if (!extraction.ok || !extraction.data) {
      throw new Error(extraction.error ?? "Could not extract this page.");
    }
    return extraction.data;
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      throw error;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["assets/content.js"]
    });

    const retry = await sendTabMessage<LinkedInProfile>(tab.id, { type: "EXTRACT_LINKEDIN_PROFILE" });
    if (!retry.ok || !retry.data) {
      throw new Error(retry.error ?? "Could not extract this page after loading the analyzer.");
    }
    return retry.data;
  }
}

export async function analyzeCurrentTab(): Promise<LinkedInAnalysis> {
  const tab = await activeTab();
  const profile = await extractFromTab(tab);
  const signals = extractLinkedInSignals(profile);
  const scores = scoreLinkedInProfile(signals);
  const settings = await getSettings();
  const fallbackInsight = buildFallbackInsight(profile, scores, signals);
  const baseAnalysis: LinkedInAnalysis = {
    id: createId(),
    source: "linkedin",
    profile,
    signals,
    scores,
    insight: fallbackInsight,
    status: settings.enableLlm ? "llm" : "complete",
    createdAt: new Date().toISOString()
  };

  await saveAnalysis(baseAnalysis);

  if (!settings.enableLlm) {
    return baseAnalysis;
  }

  try {
    const insight = await generateLinkedInInsight(profile, signals, scores, settings);
    const completed = { ...baseAnalysis, insight, status: "complete" as const };
    await saveAnalysis(completed);
    return completed;
  } catch (error) {
    const completed = { ...baseAnalysis, status: "complete" as const };
    await saveAnalysis(completed);
    return completed;
  }
}

function assertResumeUsable(resume: ResumePayload): void {
  if (!resume.text || resume.text.trim().length < 80) {
    throw new Error("Upload a resume with enough readable text before generating outreach.");
  }
  if (!resume.fileName) {
    throw new Error("Resume file name is missing.");
  }
}

async function generateOutreachFromProfile(message: Extract<AppMessage, { type: "GENERATE_PROFILE_OUTREACH" }>): Promise<LinkedInAnalysis> {
  const contextPrompt = message.contextPrompt.trim();
  const intent = message.intent.trim();
  if (!contextPrompt && !intent) {
    throw new Error("Add a short context prompt or pick an intent, such as hiring, pitching, partnership, or recruiting.");
  }

  assertResumeUsable(message.resume);

  const signedInUser = await getCurrentUser();
  if (!signedInUser) {
    throw new Error("Sign in with Google to generate outreach.");
  }

  const analysis = await getLatestAnalysis();
  if (!analysis) {
    throw new Error("Run a LinkedIn analysis before generating profile-aware outreach.");
  }

  const settings = await getSettings();
  if (!settings.enableLlm) {
    throw new Error("Enable local LLM generation in Settings before generating profile-aware outreach.");
  }

  const promptContext = [intent, contextPrompt].filter(Boolean).join(" - ");

  const insight = await generateProfileOutreach({
    profile: analysis.profile,
    signals: analysis.signals,
    scores: analysis.scores,
    settings,
    resumeName: message.resume.fileName,
    resumeText: message.resume.text,
    contextPrompt: promptContext
  });
  const completed = { ...analysis, insight, status: "complete" as const, error: undefined };
  await saveAnalysis(completed);
  return completed;
}

export async function routeMessage(message: AppMessage): Promise<unknown> {
  switch (message.type) {
    case "ANALYZE_CURRENT_TAB":
      return analyzeCurrentTab();
    case "GENERATE_PROFILE_OUTREACH":
      return generateOutreachFromProfile(message as GenerateProfileOutreachMessage);
    case "GET_LATEST_ANALYSIS":
      return getLatestAnalysis();
    case "GET_OUTREACH_PREFERENCES":
      return getOutreachPreferences();
    case "SAVE_OUTREACH_PREFERENCES": {
      const prefs: OutreachPreferences = {
        ...(message as Extract<AppMessage, { type: "SAVE_OUTREACH_PREFERENCES" }>).preferences,
        updatedAt: new Date().toISOString()
      };
      await saveOutreachPreferences(prefs);
      return prefs;
    }
    case "CHECK_OLLAMA":
      return checkOllama(await getSettings());
    case "GET_SETTINGS":
      return getSettings();
    case "SAVE_SETTINGS":
      await saveSettings(message.settings);
      return message.settings;
    case "DELETE_ALL_DATA":
      await deleteAllData();
      return { deleted: true };
    case "FIND_EMAIL": {
      const analysis = await getLatestAnalysis();
      if (!analysis) throw new Error("Run a LinkedIn analysis first.");

      const settings = await getSettings();
      const hasOwnKey = Boolean(settings.hunterApiKey?.trim());

      // Own-key users skip the shared server; everyone else must be signed in,
      // and the server enforces the per-account verified-lookup limit.
      let token: string | null = null;
      if (!hasOwnKey) {
        token = await getAccessToken(false);
        if (!token) {
          throw new Error("Sign in with Google to use the email finder.");
        }
      }

      return findEmailsForAnalysis(analysis, settings, { token });
    }
    case "SIGN_IN": {
      await signIn();
      return buildAuthState(await getSettings());
    }
    case "SIGN_OUT":
      await signOut();
      return { signedOut: true };
    case "GET_AUTH_STATE":
      return buildAuthState(await getSettings());
    default:
      throw new Error("Unsupported message.");
  }
}
