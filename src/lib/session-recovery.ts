const REMEMBERED_PHONE_KEY = "taste-of-conventions:last-login-phone";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function rememberLoginPhone(phone: string) {
  if (!hasBrowserStorage()) return;
  const cleaned = phone.trim();
  if (cleaned) window.localStorage.setItem(REMEMBERED_PHONE_KEY, cleaned);
}

export function getRememberedLoginPhone() {
  if (!hasBrowserStorage()) return null;
  return window.localStorage.getItem(REMEMBERED_PHONE_KEY);
}

export function rememberLoginPhoneFromStoredSession() {
  if (!hasBrowserStorage() || getRememberedLoginPhone()) return;
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.includes("auth-token")) continue;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
      const user = parsed.user || parsed.currentSession?.user;
      const phone = user?.phone || user?.user_metadata?.phone;
      if (typeof phone === "string" && phone.trim()) {
        rememberLoginPhone(phone);
        return;
      }
    } catch {
      // Ignore unrelated localStorage entries.
    }
  }
}

export function forgetRememberedLoginPhone() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(REMEMBERED_PHONE_KEY);
}