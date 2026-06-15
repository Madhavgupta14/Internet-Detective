export type SupportedSource = "linkedin";

export type ExperienceItem = {
  title: string;
  company: string;
  duration?: string;
  description?: string;
};

export type ActivityItem = {
  text: string;
  date?: string;
};

export type LinkedInProfile = {
  source: "linkedin";
  url: string;
  extractedAt: string;
  name: string;
  headline: string;
  photoUrl?: string;
  location?: string;
  currentRole?: string;
  currentCompany?: string;
  about?: string;
  experience: ExperienceItem[];
  education: string[];
  certifications: string[];
  projects: string[];
  skills: string[];
  activity: ActivityItem[];
  followers?: number;
  connections?: string;
  rawTextSample: string;
  extractionConfidence: number;
};

export type SignalFactor = {
  label: string;
  impact: number;
  evidence: string;
};

export type LinkedInSignals = {
  seniority: number;
  leadership: number;
  titleAuthority: number;
  founderLikelihood: number;
  startupAffinity: number;
  hiringLanguage: number;
  teamGrowth: number;
  companyInfluence: number;
  recruitingRelevance: number;
  technicalDepth: number;
  hiringScope: string[];
  skillSignals: string[];
  confidence: number;
  evidence: SignalFactor[];
};

export type ScoreResult = {
  value: number;
  confidence: number;
  factors: SignalFactor[];
  // Plain-English explanation of the score (from the LLM when available).
  reason?: string;
};

export type LinkedInScores = {
  decisionMaker: ScoreResult;
  founder: ScoreResult;
  hiringIntent: ScoreResult;
};

export type OutreachSuggestions = {
  emailOpener: string;
  connectionRequest: string;
  icebreaker: string;
};

export type LlmInsight = {
  summary: string;
  outreach: OutreachSuggestions;
  model: string;
  generatedAt: string;
};

// The model's own judgment of the profile, used to replace the keyword-rule
// scores when the LLM is enabled. Scores are 0-100; reason is a one-line
// justification grounded in the visible profile.
export type LlmScore = {
  score: number;
  reason: string;
};

export type LlmProfileAssessment = {
  decisionMaker: LlmScore;
  founder: LlmScore;
  hiringIntent: LlmScore;
  skills: string[];
  confidence: number;
};

export type AnalysisStatus = "idle" | "extracting" | "scoring" | "llm" | "complete" | "error";

export type LinkedInAnalysis = {
  id: string;
  source: "linkedin";
  profile: LinkedInProfile;
  signals: LinkedInSignals;
  scores: LinkedInScores;
  insight?: LlmInsight;
  status: AnalysisStatus;
  error?: string;
  createdAt: string;
};

export type LlmBackend = "hosted" | "ollama";

export type AppSettings = {
  backend: LlmBackend;
  apiEndpoint: string;
  ollamaUrl: string;
  model: string;
  enableLlm: boolean;
  senderName: string;
  senderRole: string;
  hunterApiKey: string;
};

export type EmailResult = {
  email: string;
  confidence: number;
  source: "hunter" | "pattern";
};

export type ResumeFileKind = "pdf" | "docx" | "text";

export type ResumePayload = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  kind: ResumeFileKind;
  text: string;
  charCount: number;
  wordCount: number;
  pageCount?: number;
  warnings: string[];
};

export type OutreachPreferences = {
  contextPrompt: string;
  intent: string;
  hasResume: boolean;
  resumeName?: string;
  updatedAt: string;
};

export type ExtractProfileMessage = {
  type: "EXTRACT_LINKEDIN_PROFILE";
};

export type AnalyzeCurrentTabMessage = {
  type: "ANALYZE_CURRENT_TAB";
};

export type GetLatestAnalysisMessage = {
  type: "GET_LATEST_ANALYSIS";
};

export type CheckOllamaMessage = {
  type: "CHECK_OLLAMA";
};

export type SaveSettingsMessage = {
  type: "SAVE_SETTINGS";
  settings: AppSettings;
};

export type GetSettingsMessage = {
  type: "GET_SETTINGS";
};

export type DeleteAllDataMessage = {
  type: "DELETE_ALL_DATA";
};

export type GenerateProfileOutreachMessage = {
  type: "GENERATE_PROFILE_OUTREACH";
  resume: ResumePayload;
  contextPrompt: string;
  intent: string;
};

export type GetOutreachPreferencesMessage = {
  type: "GET_OUTREACH_PREFERENCES";
};

export type SaveOutreachPreferencesMessage = {
  type: "SAVE_OUTREACH_PREFERENCES";
  preferences: OutreachPreferences;
};

export type FindEmailMessage = {
  type: "FIND_EMAIL";
};

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

export type AuthState = {
  user: AuthUser | null;
  usesRemaining?: number;
  freeLimit?: number;
  usingOwnKey: boolean;
};

export type SignInMessage = {
  type: "SIGN_IN";
};

export type SignOutMessage = {
  type: "SIGN_OUT";
};

export type GetAuthStateMessage = {
  type: "GET_AUTH_STATE";
};

export type AppMessage =
  | ExtractProfileMessage
  | AnalyzeCurrentTabMessage
  | GetLatestAnalysisMessage
  | CheckOllamaMessage
  | SaveSettingsMessage
  | GetSettingsMessage
  | DeleteAllDataMessage
  | GenerateProfileOutreachMessage
  | GetOutreachPreferencesMessage
  | SaveOutreachPreferencesMessage
  | FindEmailMessage
  | SignInMessage
  | SignOutMessage
  | GetAuthStateMessage;

export type MessageResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};
