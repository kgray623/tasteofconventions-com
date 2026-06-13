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

export function forgetRememberedLoginPhone() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(REMEMBERED_PHONE_KEY);
}