# Meal photos in the text message, per cuisine

A prefilled text link (`sms:`) can only carry text — it cannot attach photos. So the text will carry a short link, and tapping it opens a photo page for that guest's cuisine.

## What you'll see

- Every meal text and Zelle-update text gains a line like:
  `See the food: https://tasteofconventions.com/meals/african`
- The link goes to a simple public page showing that cuisine's photos (Myanmar/Burmese, African, Indonesian) with the restaurant's name, phone, and how to pay.
- The line is inserted through a new `{meal_photos}` placeholder, so you can move it, reword it, or delete it in the wording box on Admin → Meal texts and My meal texts.
- If a cuisine has no photos, the placeholder renders as nothing (no empty link).

## Also from your screenshot

Burmese with-tax prices: chicken $20 → $21.80, beef $25 → $27.25. These will be saved as the Burmese restaurant's online prices so the `{online_prices}` line in the text shows them, matching Indonesian ($24/$29) and African ($21.90/$27.38).

## Technical notes

- New public route `src/routes/meals.$cuisine.tsx`: SSR, own `head()` meta, reads the restaurant row (public read) and renders the photo grid from the existing `src/assets/*-meal-*.jpg.asset.json` pointers. Cuisine slugs: `myanmar`, `african`, `indonesian`; unknown slug → not-found component.
- New shared map of cuisine → photo asset URLs + slug in a client-safe module (`src/lib/meal-photos.ts`), reused by the new page.
- `src/lib/meal-text-message.ts`: add `{meal_photos}` to `renderMealTemplate`, building the absolute URL from the site origin.
- `src/lib/meal-text-defaults.ts`: add the photo line to both default templates (meal text and Zelle update).
- `src/routes/_authenticated/admin/meal-texts.tsx` and `meal-texts-mine.tsx`: list `{meal_photos}` in the placeholder help text.
- Data change: set `chicken_price = 21.80`, `beef_price = 27.25`, price note "includes tax" on the Burmese restaurant row.
- Verification: render the SMS body for one guest per cuisine, then load each `/meals/<slug>` page at 384px width in the browser to confirm photos, phone, and pay info appear.
