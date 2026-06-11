import { DB_NAME, DB_VERSION, DEFAULT_SETTINGS } from "../shared/constants";
import type { AppSettings, LinkedInAnalysis } from "../shared/types";

type StoreName = "analyses" | "settings" | "resumes" | "outreachPreferences";

const APP_SETTINGS_KEY = "appSettings";
const OUTREACH_PREFS_KEY = "outreachContext";

export type StoredResume = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  kind: "pdf" | "docx" | "text";
  text: string;
  charCount: number;
  wordCount: number;
  pageCount?: number;
  warnings: string[];
  savedAt: string;
};

export type StoredOutreachPreferences = {
  contextPrompt: string;
  intent: string;
  lastResumeId?: string;
  updatedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("analyses")) {
        const store = db.createObjectStore("analyses", { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("url", "profile.url");
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("resumes")) {
        const store = db.createObjectStore("resumes", { keyPath: "id" });
        store.createIndex("savedAt", "savedAt");
      }
      if (!db.objectStoreNames.contains("outreachPreferences")) {
        db.createObjectStore("outreachPreferences", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(storeName: StoreName, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);
    let result: T | undefined;

    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error);
    }

    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveAnalysis(analysis: LinkedInAnalysis): Promise<void> {
  await withStore("analyses", "readwrite", (store) => store.put(analysis));
}

export async function getLatestAnalysis(): Promise<LinkedInAnalysis | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("analyses", "readonly");
    const index = tx.objectStore("analyses").index("createdAt");
    const request = index.openCursor(null, "prev");

    request.onsuccess = () => {
      resolve(request.result?.value as LinkedInAnalysis | undefined);
      db.close();
    };
    request.onerror = () => {
      reject(request.error);
      db.close();
    };
  });
}

export async function getSettings(): Promise<AppSettings> {
  const row = await withStore<{ key: string; value: AppSettings }>("settings", "readonly", (store) => store.get(APP_SETTINGS_KEY));
  return { ...DEFAULT_SETTINGS, ...(row?.value ?? {}) };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await withStore("settings", "readwrite", (store) => store.put({ key: APP_SETTINGS_KEY, value: settings }));
}

function makeResumeId(): string {
  return `resume_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function saveResume(resume: Omit<StoredResume, "id" | "savedAt">): Promise<StoredResume> {
  const stored: StoredResume = {
    ...resume,
    id: makeResumeId(),
    savedAt: new Date().toISOString()
  };
  await withStore("resumes", "readwrite", (store) => store.put(stored));
  return stored;
}

export async function getLatestResume(): Promise<StoredResume | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("resumes", "readonly");
    const index = tx.objectStore("resumes").index("savedAt");
    const request = index.openCursor(null, "prev");

    request.onsuccess = () => {
      resolve(request.result?.value as StoredResume | undefined);
      db.close();
    };
    request.onerror = () => {
      reject(request.error);
      db.close();
    };
  });
}

export async function deleteResume(id: string): Promise<void> {
  await withStore("resumes", "readwrite", (store) => store.delete(id));
}

export async function getOutreachPreferences(): Promise<StoredOutreachPreferences | undefined> {
  const row = await withStore<{ key: string; value: StoredOutreachPreferences }>("outreachPreferences", "readonly", (store) => store.get(OUTREACH_PREFS_KEY));
  return row?.value;
}

export async function saveOutreachPreferences(prefs: StoredOutreachPreferences): Promise<void> {
  await withStore("outreachPreferences", "readwrite", (store) => store.put({ key: OUTREACH_PREFS_KEY, value: prefs }));
}

export async function deleteAllData(): Promise<void> {
  await Promise.all([
    withStore("analyses", "readwrite", (store) => store.clear()),
    withStore("settings", "readwrite", (store) => store.clear()),
    withStore("resumes", "readwrite", (store) => store.clear()),
    withStore("outreachPreferences", "readwrite", (store) => store.clear())
  ]);
}
