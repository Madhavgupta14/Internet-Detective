import type { AppMessage, MessageResponse } from "../../shared/types";

export async function sendMessage<T>(message: AppMessage): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as MessageResponse<T>;
  if (!response.ok) {
    throw new Error(response.error ?? "Extension request failed.");
  }
  return response.data as T;
}

export async function openSidePanel(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
}
