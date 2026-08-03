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
  return `sms:${to}?&body=${encodeURIComponent(body)}`;
}

export type MealTextContext = {
  firstName: string;
  restaurantName: string;
  restaurantPhone: string;
  restaurantWebsite: string;
  order: string;
};

export function renderMealTemplate(tpl: string, ctx: MealTextContext) {
  return tpl
    .replaceAll("{first_name}", ctx.firstName)
    .replaceAll("{restaurant_name}", ctx.restaurantName)
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
