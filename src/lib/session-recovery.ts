const REMEMBERED_PHONE_KEY = "taste-of-conventions:last-login-phone";
const REMEMBERED_NAME_KEY = "taste-of-conventions:last-login-name";
const REMEMBERED_PHONE_COOKIE = "taste_of_conventions_last_login_phone";
const REMEMBERED_NAME_COOKIE = "taste_of_conventions_last_login_name";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
let activeSessionRecovery: Promise<unknown> | null = null;
let recoveryServerLoginDepth = 0;

function hasBrowserStorage() {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function hasDocumentCookie() {
  return typeof document !== "undefined" && typeof document.cookie === "string";
}

function rememberLoginPhoneCookie(phone: string) {
  if (!hasDocumentCookie()) return;
  const crossSiteAttrs = typeof window !== "undefined" && window.location.protocol === "https:"
    ? "; Secure; SameSite=None; Partitioned"
    : "; SameSite=Lax";
  document.cookie = `${REMEMBERED_PHONE_COOKIE}=${encodeURIComponent(phone)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}${crossSiteAttrs}`;
}

function rememberLoginNameCookie(name: string) {
  if (!hasDocumentCookie()) return;
  const crossSiteAttrs = typeof window !== "undefined" && window.location.protocol === "https:"
    ? "; Secure; SameSite=None; Partitioned"
    : "; SameSite=Lax";
  document.cookie = `${REMEMBERED_NAME_COOKIE}=${encodeURIComponent(name)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}${crossSiteAttrs}`;
}

function getRememberedLoginPhoneCookie() {
  if (!hasDocumentCookie()) return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REMEMBERED_PHONE_COOKIE}=`));
  if (!match) return null;
  const value = match.slice(REMEMBERED_PHONE_COOKIE.length + 1);
  try {
    return decodeURIComponent(value) || null;
  } catch {
    return value || null;
  }
}

function getRememberedLoginNameCookie() {
  if (!hasDocumentCookie()) return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REMEMBERED_NAME_COOKIE}=`));
  if (!match) return null;
  const value = match.slice(REMEMBERED_NAME_COOKIE.length + 1);
  try {
    return decodeURIComponent(value) || null;
  } catch {
    return value || null;
  }
}

function forgetRememberedLoginPhoneCookie() {
  if (!hasDocumentCookie()) return;
  document.cookie = `${REMEMBERED_PHONE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${REMEMBERED_PHONE_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=None; Partitioned`;
  document.cookie = `${REMEMBERED_NAME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${REMEMBERED_NAME_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=None; Partitioned`;
}

export function rememberLoginPhone(phone: string) {
  const cleaned = phone.trim();
  if (!cleaned) return;
  if (hasBrowserStorage()) window.localStorage.setItem(REMEMBERED_PHONE_KEY, cleaned);
  rememberLoginPhoneCookie(cleaned);
}

export function getRememberedLoginPhone() {
  const stored = hasBrowserStorage() ? window.localStorage.getItem(REMEMBERED_PHONE_KEY) : null;
  if (stored) return stored;
  const cookiePhone = getRememberedLoginPhoneCookie();
  if (cookiePhone && hasBrowserStorage()) window.localStorage.setItem(REMEMBERED_PHONE_KEY, cookiePhone);
  return cookiePhone;
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
      const name = user?.user_metadata?.display_name || user?.user_metadata?.name;
      if (typeof phone === "string" && phone.trim()) {
        rememberLoginPhone(phone);
        if (typeof name === "string" && name.trim()) rememberLoginName(name);
        return;
      }
    } catch {
      // Ignore unrelated localStorage entries.
    }
  }
}

export function forgetRememberedLoginPhone() {
  if (hasBrowserStorage()) {
    window.localStorage.removeItem(REMEMBERED_PHONE_KEY);
    window.localStorage.removeItem(REMEMBERED_NAME_KEY);
  }
  forgetRememberedLoginPhoneCookie();
}

export function rememberLoginName(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return;
  if (hasBrowserStorage()) window.localStorage.setItem(REMEMBERED_NAME_KEY, cleaned);
  rememberLoginNameCookie(cleaned);
}

export function getRememberedLoginName() {
  const stored = hasBrowserStorage() ? window.localStorage.getItem(REMEMBERED_NAME_KEY) : null;
  if (stored) return stored;
  const cookieName = getRememberedLoginNameCookie();
  if (cookieName && hasBrowserStorage()) window.localStorage.setItem(REMEMBERED_NAME_KEY, cookieName);
  return cookieName;
}

export function hasRememberedLoginCredentials() {
  return Boolean(getRememberedLoginPhone() && getRememberedLoginName());
}

export function publishSessionRecovery(promise: Promise<unknown>) {
  activeSessionRecovery = promise;
  void promise.finally(() => {
    if (activeSessionRecovery === promise) activeSessionRecovery = null;
  });
}

export function isSessionRecoveryActive() {
  return Boolean(activeSessionRecovery);
}

export function beginRecoveryServerLogin() {
  recoveryServerLoginDepth += 1;
}

export function endRecoveryServerLogin() {
  recoveryServerLoginDepth = Math.max(0, recoveryServerLoginDepth - 1);
}

export function isRecoveryServerLoginAllowed() {
  return recoveryServerLoginDepth > 0;
}

export async function waitForSessionRecovery(timeoutMs = 4000) {
  const recovery = activeSessionRecovery;
  if (!recovery) return;
  await Promise.race([
    recovery.catch(() => null),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
// --- Authoritative session tracking -----------------------------------------
// A session that was just established (fresh login, or a live session handed to
// us by Supabase) is authoritative for a short window. While it is, a stray
// null-session event (e.g. a stale refresh token from another tab getting
// rejected) must NOT trigger a brand-new server login — that churn is what made
// a successful sign-in look like it never happened.
let authoritativeSessionAt = 0;

export function markSessionAuthoritative() {
  authoritativeSessionAt = Date.now();
}

export function clearSessionAuthoritative() {
  authoritativeSessionAt = 0;
}

export function isSessionAuthoritative(withinMs = 60_000) {
  return authoritativeSessionAt > 0 && Date.now() - authoritativeSessionAt < withinMs;
}

/** True when Supabase still has a usable session persisted in this browser. */
export function hasStoredSupabaseSession() {
  if (!hasBrowserStorage()) return false;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.includes("auth-token")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const session = parsed?.currentSession ?? parsed;
      if (session?.access_token && session?.refresh_token) return true;
    }
  } catch {
    // Unreadable storage — treat as no stored session.
  }
  return false;
}
