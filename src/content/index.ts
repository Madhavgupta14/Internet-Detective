import type { AppMessage, LinkedInProfile, MessageResponse } from "../shared/types";
import { extractLinkedInProfile } from "./linkedinExtractor";
import { isLinkedInProfilePage } from "./pageDetector";

type ExtractHandler = () => MessageResponse<LinkedInProfile>;

const HANDLER_KEY = "__spectraExtract";
const LISTENER_KEY = "__spectraListenerRegistered";

// Update the handler on every injection so re-injections always use the latest code.
(window as unknown as Record<string, ExtractHandler>)[HANDLER_KEY] = (): MessageResponse<LinkedInProfile> => {
  if (!isLinkedInProfilePage()) {
    return { ok: false, error: "This page is not a supported LinkedIn profile." };
  }
  try {
    return { ok: true, data: extractLinkedInProfile() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "LinkedIn extraction failed." };
  }
};

// Register the Chrome message listener only once per page load.
if (!(window as unknown as Record<string, boolean>)[LISTENER_KEY]) {
  (window as unknown as Record<string, boolean>)[LISTENER_KEY] = true;
  chrome.runtime.onMessage.addListener((message: AppMessage, _sender, sendResponse) => {
    if (message.type !== "EXTRACT_LINKEDIN_PROFILE") return false;
    const handler = (window as unknown as Record<string, ExtractHandler>)[HANDLER_KEY];
    sendResponse(handler());
    return false;
  });
}
