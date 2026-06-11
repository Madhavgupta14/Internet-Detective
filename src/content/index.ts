import type { AppMessage, MessageResponse } from "../shared/types";
import { extractLinkedInProfile } from "./linkedinExtractor";
import { isLinkedInProfilePage } from "./pageDetector";

chrome.runtime.onMessage.addListener((message: AppMessage, _sender, sendResponse) => {
  if (message.type !== "EXTRACT_LINKEDIN_PROFILE") {
    return false;
  }

  if (!isLinkedInProfilePage()) {
    const response: MessageResponse<never> = {
      ok: false,
      error: "This page is not a supported LinkedIn profile."
    };
    sendResponse(response);
    return false;
  }

  try {
    sendResponse({ ok: true, data: extractLinkedInProfile() });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "LinkedIn extraction failed."
    });
  }

  return false;
});
