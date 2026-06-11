export function isLinkedInProfilePage(url = window.location.href): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith("linkedin.com") && /^\/in\/[^/]+\/?/.test(parsed.pathname);
  } catch {
    return false;
  }
}
