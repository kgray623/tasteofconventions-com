const REMEMBERED_PHONE_KEY = "taste-of-conventions:last-login-phone";
const REMEMBERED_NAME_KEY = "taste-of-conventions:last-login-name";
const REMEMBERED_PHONE_COOKIE = "taste_of_conventions_last_login_phone";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

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

function forgetRememberedLoginPhoneCookie() {
  if (!hasDocumentCookie()) return;
  document.cookie = `${REMEMBERED_PHONE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${REMEMBERED_PHONE_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=None; Partitioned`;
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
  if (hasBrowserStorage()) {
    window.localStorage.removeItem(REMEMBERED_PHONE_KEY);
    window.localStorage.removeItem(REMEMBERED_NAME_KEY);
  }
  forgetRememberedLoginPhoneCookie();
}

export function rememberLoginName(name: string) {
  const cleaned = name.trim();
  if (!cleaned || !hasBrowserStorage()) return;
  window.localStorage.setItem(REMEMBERED_NAME_KEY, cleaned);
}

export function getRememberedLoginName() {
  if (!hasBrowserStorage()) return null;
  return window.localStorage.getItem(REMEMBERED_NAME_KEY);
}