// Shared helpers for building meal pre-order text messages. Used by both the
// admin-wide meal texts page and the per-committee-member page so the wording,
// phone formatting and recipient chunking can never drift apart.

import { mealPhotoSetFor } from "@/lib/meal-photos";

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
  paymentOptions?: string;
  restaurantZelle?: string;
  zelleLine?: string;
  venmoLine?: string;
  onlinePrices?: string;
  mealChoices?: string;
  paySentence?: string;
  mealPhotos?: string;
  zelleQrLink?: string;
  /** Tap-to-pay Zelle deep link (same destination the QR code encodes). */
  zelleLink?: string;

};

type PaymentSource = {
  phone?: string | null;
  zelle_qr_url?: string | null;
  zelle_pay_link?: string | null;
  venmo_handle?: string | null;
  zelle_name?: string | null;
  zelle_phone?: string | null;
  chicken_price?: number | string | null;
  beef_price?: number | string | null;
  price_note?: string | null;
};

const money = (v: number | string | null | undefined) => {
  const n = typeof v === "string" ? Number(v) : v;
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
};

/** Payment lines for one restaurant — only the options that restaurant actually accepts. */
export function paymentLines(r: PaymentSource | undefined | null) {
  const phone = r?.phone?.trim() ?? "";
  const venmo = r?.venmo_handle?.trim() ?? "";
  const zellePhone = r?.zelle_phone?.trim() ?? "";
  const zelleName = r?.zelle_name?.trim() ?? "";
  const venmoHandle = venmo ? `@${venmo.replace(/^@/, "")}` : "";

  const venmoLine = venmo ? `Venmo: ${venmoHandle}` : "";
  const zelleLine = zellePhone
    ? `Zelle: ${zellePhone}${zelleName ? ` (${zelleName})` : ""}`
    : zelleName
      ? `Zelle: ${zelleName}`
      : "";

  // The restaurant's own pay-online identity block (Zelle first, Venmo when offered).
  const restaurantZelle = [zelleLine, venmoLine].filter(Boolean).join("\n");

  const chicken = money(r?.chicken_price ?? null);
  const beef = money(r?.beef_price ?? null);
  const note = r?.price_note?.trim() ?? "";
  // Both choices always visible, one per line, with the price note underneath.
  const onlinePrices = [
    chicken ? `Chicken ${chicken}` : "",
    beef ? `Beef ${beef}` : "",
    (chicken || beef) && note ? `(${note})` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // "Chicken Meal plate $24" / "Beef Meal plate $29", spaced one per paragraph.
  const mealChoices = [
    chicken ? `Chicken Meal plate ${chicken}` : "",
    beef ? `Beef Meal plate ${beef}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // The Zelle identity to look up (or the fallback way to pay this restaurant).
  const zelleTarget = zellePhone || zelleName;
  const zelleIdentity = zelleTarget
    ? `${zelleTarget}${zellePhone && zelleName ? ` (${zelleName})` : ""}`
    : "";
  const paySentence = zelleIdentity
    ? `${`Or search by phone number ${zelleIdentity}`}${
        venmoHandle ? `\nVenmo: ${venmoHandle}` : ""
      }`
    : venmoHandle
      ? `Venmo: ${venmoHandle}`
      : phone
        ? `To pay by phone, call the restaurant: ${phone}`
        : "";

  const paymentOptions = [
    zelleLine,
    venmoLine,
    phone ? `Or call to pay by phone: ${phone}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    paymentOptions,
    restaurantZelle,
    venmoLine,
    zelleLine,
    onlinePrices,
    mealChoices,
    paySentence,
  };
}

export function renderMealTemplate(tpl: string, ctx: MealTextContext) {
  return tpl
    .replaceAll("{first_name}", ctx.firstName)
    .replaceAll("{restaurant_name}", ctx.restaurantName)
    .replaceAll("{restaurant_cuisine}", ctx.restaurantCuisine)
    .replaceAll("{restaurant_phone}", ctx.restaurantPhone)
    .replaceAll("{restaurant_website}", ctx.restaurantWebsite)
    .replaceAll("{order}", ctx.order)
    .replaceAll("{payment_options}", ctx.paymentOptions ?? "")
    .replaceAll("{restaurant_zelle}", ctx.restaurantZelle ?? "")
    .replaceAll("{zelle_line}", ctx.zelleLine ?? "")
    .replaceAll("{venmo_line}", ctx.venmoLine ?? "")
    .replaceAll("{online_prices}", ctx.onlinePrices ?? "")
    .replaceAll("{meal_choices}", ctx.mealChoices ?? "")
    .replaceAll("{pay_sentence}", ctx.paySentence ?? "")
    .replaceAll("{meal_photos}", ctx.mealPhotos ?? "")
    .replaceAll("{zelle_qr_link}", ctx.zelleQrLink ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "See the food images at: https://.../meals/african" — empty when the cuisine has no photos. */
export function mealPhotosLine(cuisine: string | null | undefined) {
  const set = mealPhotoSetFor(cuisine);
  if (!set) return "";
  return `See the food images at: ${PUBLIC_SITE_ORIGIN}/meals/${set.slug}`;
}

/**
 * "Use the Zelle QR code: https://.../meals/african" — empty unless the
 * restaurant actually has a QR image saved AND the cuisine has a public page.
 */
export function zelleQrLinkLine(
  cuisine: string | null | undefined,
  restaurant: { zelle_qr_url?: string | null } | null | undefined,
) {
  if (!restaurant?.zelle_qr_url) return "";
  const set = mealPhotoSetFor(cuisine);
  if (!set) return "";
  return `To prepay, please click here ${PUBLIC_SITE_ORIGIN}/meals/${set.slug}`;
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
