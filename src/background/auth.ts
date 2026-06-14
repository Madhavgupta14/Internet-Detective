export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

function getRawToken(interactive: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError || !token) {
          resolve(null);
          return;
        }
        // Chrome may return a string or { token } depending on version.
        resolve(typeof token === "string" ? token : ((token as { token?: string }).token ?? null));
      });
    } catch {
      resolve(null);
    }
  });
}

async function fetchUserInfo(token: string): Promise<AuthUser> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error("Could not read your Google account info.");
  }
  const data = (await res.json()) as { sub: string; email: string; name?: string; picture?: string };
  return { id: data.sub, email: data.email, name: data.name, picture: data.picture };
}

/** Returns a valid Google access token, or null if the user is not signed in. */
export async function getAccessToken(interactive: boolean): Promise<string | null> {
  return getRawToken(interactive);
}

export async function signIn(): Promise<AuthUser> {
  const token = await getRawToken(true);
  if (!token) {
    throw new Error("Google sign-in was cancelled or is not configured.");
  }
  return fetchUserInfo(token);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getRawToken(false);
  if (!token) {
    return null;
  }
  try {
    return await fetchUserInfo(token);
  } catch {
    // Token may be stale; drop it so the next interactive sign-in is clean.
    chrome.identity.removeCachedAuthToken({ token });
    return null;
  }
}

export async function signOut(): Promise<void> {
  const token = await getRawToken(false);
  if (!token) {
    return;
  }
  try {
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${encodeURIComponent(token)}`);
  } catch {
    // Best effort revoke.
  }
  chrome.identity.removeCachedAuthToken({ token });
}
