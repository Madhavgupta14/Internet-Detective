import type { AppSettings } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  ollamaUrl: "http://localhost:11434",
  model: "qwen3:0.6b",
  enableLlm: true
};

export const DB_NAME = "internet-detective";
export const DB_VERSION = 2;
