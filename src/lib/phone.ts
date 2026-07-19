/**
 * Canonical phone helpers (audit MEDIUM-001).
 *
 * Business rule: guests are identified by phone (SMS-only project). Two phones
 * are considered "the same person" when their last 10 digits match — this
 * absorbs country-code differences, punctuation, and typos where the country
 * code is missing.
 *
 * Import from `@/lib/phone` instead of re-implementing `.replace(/\D/g, "")`
 * inline so every dashboard, server function, and matcher agrees on the rule.
 */

/** Strip everything except digits. Returns "" for null/undefined/blank. */
export const digitsOnly = (value: string | null | undefined): string =>
  (value ?? "").replace(/\D/g, "");

/**
 * Canonical normalization: digits only. Mirrors the DB generated column
 * `guest_phone_normalized` so client comparisons match server-side matches.
 */
export const normalizePhone = digitsOnly;

/** Last 10 digits — the matching key used across triggers and dashboards. */
export const phoneTail = (value: string | null | undefined, length = 10): string =>
  digitsOnly(value).slice(-length);

/**
 * True when two phones represent the same person (last 10 digits match and
 * both have at least 7 digits so we don't false-match on tiny fragments).
 */
export const phoneMatches = (
  a: string | null | undefined,
  b: string | null | undefined,
): boolean => {
  const aDigits = digitsOnly(a);
  const bDigits = digitsOnly(b);
  if (aDigits.length < 7 || bDigits.length < 7) return false;
  return phoneTail(aDigits) === phoneTail(bDigits);
};

/** Human-readable US format: (555) 555-1234. Falls back to raw input if it doesn't parse. */
export const formatPhoneUS = (value: string | null | undefined): string => {
  const d = digitsOnly(value);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return value ?? "";
};
