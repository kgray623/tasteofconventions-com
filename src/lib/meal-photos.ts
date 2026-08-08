// Shared, client-safe map of cuisine -> photos + the public photo-page slug.
// Used by the /meals/$cuisine page and by the meal text {meal_photos} line.
import africanMeal1 from "@/assets/african-meal-1.jpg.asset.json";
import africanMeal2 from "@/assets/african-meal-2.jpg.asset.json";
import africanMeal3 from "@/assets/african-meal-3.jpg.asset.json";
import indonesianMeal1 from "@/assets/indonesian-meal-1.jpg.asset.json";
import indonesianMeal2 from "@/assets/indonesian-meal-2.jpg.asset.json";
import indonesianMeal3 from "@/assets/indonesian-meal-3.jpg.asset.json";
import myanmarMeal1 from "@/assets/myanmar-meal-1.jpg.asset.json";
import myanmarMeal2 from "@/assets/myanmar-meal-2.jpg.asset.json";
import myanmarMeal3 from "@/assets/myanmar-meal-3.jpg.asset.json";
import myanmarMeal4 from "@/assets/myanmar-meal-4.jpg.asset.json";

export type MealPhotoSet = {
  slug: string;
  /** Cuisine key as stored on pre-orders. */
  cuisine: string;
  label: string;
  photos: string[];
};

export const MEAL_PHOTO_SETS: MealPhotoSet[] = [
  {
    slug: "myanmar",
    cuisine: "Myanmar",
    label: "Myanmar (Burmese)",
    photos: [myanmarMeal1.url, myanmarMeal2.url, myanmarMeal3.url, myanmarMeal4.url],
  },
  {
    slug: "african",
    cuisine: "African",
    label: "African",
    photos: [africanMeal1.url, africanMeal2.url, africanMeal3.url],
  },
  {
    slug: "indonesian",
    cuisine: "Indonesian",
    label: "Indonesian",
    photos: [indonesianMeal1.url, indonesianMeal2.url, indonesianMeal3.url],
  },
];

const norm = (v: string) => v.trim().toLowerCase();

/** Match a stored cuisine (or restaurant name) to its photo set. */
export function mealPhotoSetFor(cuisine: string | null | undefined): MealPhotoSet | undefined {
  const t = norm(cuisine ?? "");
  if (!t) return undefined;
  return MEAL_PHOTO_SETS.find(
    (s) =>
      norm(s.cuisine) === t ||
      s.slug === t ||
      (s.slug === "myanmar" && (t.includes("burmese") || t.includes("myanmar"))) ||
      (s.slug === "african" && (t.includes("african") || t.includes("ethiop"))) ||
      (s.slug === "indonesian" && t.includes("indonesi")),
  );
}

export function mealPhotoSetBySlug(slug: string) {
  return MEAL_PHOTO_SETS.find((s) => s.slug === norm(slug));
}
