// Shared, client-safe catered-meal pricing and payment-deadline copy.
//
// Prices are NOT the same for all three partner restaurants and they already
// include sales tax. The authoritative values live in the `restaurants` table
// (`chicken_price`, `beef_price`, `price_note`); the map below mirrors them so
// public/marketing copy can render without a database round-trip. Anywhere a
// restaurant row is already loaded, pass it in and the live row wins.

import { normalizeCuisine } from "@/lib/preorder-math";

export type MealPrices = {
  restaurant: string;
  chicken: number | null;
  beef: number | null;
  note: string | null;
};

/** Mirror of the `restaurants` table, keyed by normalized cuisine. */
export const MEAL_PRICES_BY_CUISINE: Record<string, MealPrices> = {
  African: { restaurant: "Lalibela", chicken: 21.9, beef: 27.38, note: "includes tax" },
  Myanmar: { restaurant: "Burmese", chicken: 21.8, beef: 27.25, note: "includes tax" },
  Indonesian: {
    restaurant: "Koen",
    chicken: 24,
    beef: 29,
    note: "includes tax and delivery fees",
  },
};

export const formatMealMoney = (value: number | string | null | undefined): string | null => {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  return Number.isInteger(n) ? `$${n}` : `$${(n as number).toFixed(2)}`;
};

type RestaurantLike = {
  name?: string | null;
  cuisine?: string | null;
  chicken_price?: number | string | null;
  beef_price?: number | string | null;
  price_note?: string | null;
};

/**
 * Exact prices for one cuisine. A live `restaurants` row always wins over the
 * mirrored fallback so a price edit in the database shows up immediately.
 */
export function mealPricesForCuisine(
  cuisine: string | null | undefined,
  restaurants?: RestaurantLike[] | null,
): MealPrices | null {
  const key = normalizeCuisine(String(cuisine ?? ""));
  if (!key) return null;
  const fallback = MEAL_PRICES_BY_CUISINE[key] ?? null;
  const live = (restaurants ?? []).find(
    (r) => normalizeCuisine(String(r.cuisine ?? r.name ?? "")) === key,
  );
  if (!live) return fallback;
  const chicken = live.chicken_price === null || live.chicken_price === undefined
    ? fallback?.chicken ?? null
    : Number(live.chicken_price);
  const beef = live.beef_price === null || live.beef_price === undefined
    ? fallback?.beef ?? null
    : Number(live.beef_price);
  return {
    restaurant: live.name?.trim() || fallback?.restaurant || key,
    chicken: Number.isFinite(chicken as number) ? (chicken as number) : null,
    beef: Number.isFinite(beef as number) ? (beef as number) : null,
    note: live.price_note?.trim() || fallback?.note || null,
  };
}

/** "Chicken $21.90 per plate · Beef $27.38 per plate (includes tax)" */
export function mealPriceLine(prices: MealPrices | null | undefined): string | null {
  if (!prices) return null;
  const chicken = formatMealMoney(prices.chicken);
  const beef = formatMealMoney(prices.beef);
  if (!chicken && !beef) return null;
  const parts = [
    chicken ? `Chicken ${chicken} per plate` : null,
    beef ? `Beef ${beef} per plate` : null,
  ].filter(Boolean);
  return `${parts.join(" · ")}${prices.note ? ` (${prices.note})` : ""}`;
}

/** All three restaurants, for pages that don't know the cuisine yet. */
export function allMealPriceLines(restaurants?: RestaurantLike[] | null): string[] {
  return Object.keys(MEAL_PRICES_BY_CUISINE)
    .map((cuisine) => {
      const prices = mealPricesForCuisine(cuisine, restaurants);
      const line = mealPriceLine(prices);
      if (!line || !prices) return null;
      return `${prices.restaurant} (${cuisine}): ${line}`;
    })
    .filter((line): line is string => !!line);
}

/** Short one-liner: prices vary by restaurant, tax included. */
export const MEAL_PRICE_SUMMARY =
  "Each restaurant sets its own prices, tax included \u2014 Lalibela (African cuisine) $21.90 chicken / $27.38 beef, Burmese (Myanmar cuisine) $21.80 chicken / $27.25 beef, Koen (Indonesian cuisine) $24 chicken / $29 beef (includes tax and delivery fees).";

export const MEAL_PAY_DEADLINE = "Sunday, August 23";
export const MEAL_PAY_DEADLINE_LINE =
  "Preorders are closed. Pay the restaurant directly to be added to their wait list \u2014 your plate is confirmed once the restaurant accepts your payment.";

/** One-paragraph guest explanation used above the cuisine cards. */
export const MEAL_INTRO_COPY =
  "Preorders are closed. The restaurants need time to prepare a large number of plates, so any new order goes on that restaurant's wait list: pay the restaurant directly \u2014 Zelle is their preferred method \u2014 and your plate is confirmed once the restaurant accepts your payment. Each restaurant offers a chicken or beef plate. All plates are gluten-free, MSG-free, and made only with beef tallow or butter. Prices below already include tax.";

/** Restaurant name for a cuisine key, e.g. "Myanmar" -> "Burmese". */
export function restaurantNameForCuisine(
  cuisine: string | null | undefined,
  restaurants?: RestaurantLike[] | null,
): string {
  const prices = mealPricesForCuisine(cuisine, restaurants);
  return prices?.restaurant || String(cuisine ?? "").trim();
}
