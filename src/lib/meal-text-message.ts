// Shared helpers for building meal pre-order text messages. Used by both the
// admin-wide meal texts page and the per-committee-member page so the wording,
// phone formatting and recipient chunking can never drift apart.

export const SMS_CHUNK = 20;

export const smsDigits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

export function smsNumber(value: string | null | undefined) {
  const d = smsDigits(value);
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d ? `+${d}` : "";
}

export function smsHref(numbers: string[], body: string) {
  const to = numbers.filter(Boolean).join(",");
  return `sms:${to}?body=${encodeURIComponent(body)}`;
}

export type OpenSmsResult = { ok: true } | { ok: false; reason: string };

export const PUBLIC_SITE_ORIGIN = "https://tasteofconventions.com";

/** True when the page is running inside a frame / embedded webview (e.g. the Lovable preview). */
export function isEmbedded() {
  if (typeof window === "undefined") return false;
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/** The same page on the real published site, so Messages can actually be opened. */
export function publicSiteUrl(path?: string) {
  const p =
    path ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  return `${PUBLIC_SITE_ORIGIN}${p.startsWith("/") ? p : `/${p}`}`;
}

/** Android's own handoff scheme — accepted by webviews that swallow plain sms:. */
function androidIntentUrl(numbers: string[], body: string) {
  const to = numbers.filter(Boolean).join(",");
  return `intent://${to}#Intent;scheme=smsto;action=android.intent.action.SENDTO;S.sms_body=${encodeURIComponent(
    body,
  )};end`;
}

// Opens the phone's Messages app. Inside a framed preview (and some mobile
// browsers) a plain <a href="sms:..."> click is swallowed, so hand the URL to
// the top-level document when we're allowed to reach it.
export function openSms(numbers: string[], body: string): OpenSmsResult {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { ok: false, reason: "Texting is only available in a browser." };
  }
  const to = numbers.filter(Boolean);
  if (to.length === 0) return { ok: false, reason: "No phone number on file." };

  const url = smsHref(to, body);
  const isAndroid = /android/i.test(navigator.userAgent);
  const candidates = isAndroid ? [url, androidIntentUrl(to, body)] : [url];

  for (const candidate of candidates) {
    // 1. Anchor click inside the top-level document (works in framed previews).
    try {
      const topDoc = window.top?.document ?? document;
      const a = topDoc.createElement("a");
      a.href = candidate;
      a.style.display = "none";
      topDoc.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 2000);
      return { ok: true };
    } catch {
      /* cross-origin frame — fall through */
    }

    // 2. Same-document navigation.
    try {
      window.location.assign(candidate);
      return { ok: true };
    } catch {
      /* fall through */
    }

    // 3. New window as a last resort.
    try {
      const w = window.open(candidate, "_blank");
      if (w) return { ok: true };
    } catch {
      /* ignore */
    }
  }

  return { ok: false, reason: "Your browser blocked opening Messages." };
}



export type MealTextContext = {
  firstName: string;
  restaurantName: string;
  restaurantCuisine: string;
  restaurantPhone: string;
  restaurantWebsite: string;
  order: string;
};

export function renderMealTemplate(tpl: string, ctx: MealTextContext) {
  return tpl
    .replaceAll("{first_name}", ctx.firstName)
    .replaceAll("{restaurant_name}", ctx.restaurantName)
    .replaceAll("{restaurant_cuisine}", ctx.restaurantCuisine)
    .replaceAll("{restaurant_phone}", ctx.restaurantPhone)
    .replaceAll("{restaurant_website}", ctx.restaurantWebsite)
    .replaceAll("{order}", ctx.order)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const mealOrderText = (qty: number, cuisine: string) =>
  `${qty} ${cuisine} meal${qty === 1 ? "" : "s"}`;

export const cuisineLabel = (cuisine: string) =>
  cuisine === "Myanmar" ? "Myanmar (Burmese)" : cuisine;

export function chunkNumbers(numbers: string[], size = SMS_CHUNK) {
  const chunks: string[][] = [];
  for (let i = 0; i < numbers.length; i += size) chunks.push(numbers.slice(i, i + size));
  return chunks;
}

export function matchRestaurant<T extends { name: string; cuisine: string | null }>(
  restaurants: T[],
  cuisine: string,
): T | undefined {
  const target = cuisine.toLowerCase();
  return restaurants.find(
    (r) =>
      (r.cuisine ?? "").toLowerCase() === target ||
      r.name.toLowerCase() === target ||
      (cuisine === "Myanmar" && r.name.toLowerCase().includes("burmese")),
  );
}
