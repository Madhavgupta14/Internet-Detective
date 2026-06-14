import type { AppSettings } from "./types";

// Hosted Groq proxy (Vercel).
export const HOSTED_ENDPOINT = "https://internet-detective-proxy.vercel.app";

// Default cloud model served by the hosted proxy (Groq).
export const HOSTED_MODEL = "llama-3.3-70b-versatile";

export const DEFAULT_SETTINGS: AppSettings = {
  backend: "hosted",
  apiEndpoint: HOSTED_ENDPOINT,
  ollamaUrl: "http://localhost:11434",
  model: "qwen3:4b",
  enableLlm: true,
  senderName: "",
  senderRole: "",
  hunterApiKey: ""
};

export const DB_NAME = "spectra";
export const DB_VERSION = 2;
