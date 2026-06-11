import type { AppMessage, MessageResponse } from "../shared/types";
import { routeMessage } from "./messageRouter";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    // Older Chromium builds may not support this behavior.
  });
});

chrome.runtime.onMessage.addListener((message: AppMessage, _sender, sendResponse) => {
  routeMessage(message)
    .then((data) => {
      const response: MessageResponse<unknown> = { ok: true, data };
      sendResponse(response);
    })
    .catch((error) => {
      const response: MessageResponse<never> = {
        ok: false,
        error: error instanceof Error ? error.message : "Request failed."
      };
      sendResponse(response);
    });

  return true;
});
