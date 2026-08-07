# Separate the "texted" mark for each restaurant meal

## The problem (confirmed)

The texted mark is stored once per guest pre-order, not once per meal. In the database, `cuisine_preorders` has a single `meal_text_sent_at` timestamp, and every cuisine row on the meal-text pages reads that same value. So if a guest ordered Burmese, African and Indonesian, texting them about Burmese instantly shows all three as "Texted" — even though only one text was sent.

## What will change

Each meal (guest + restaurant/cuisine) gets its own texted mark.

- Texting a guest about their Burmese meal marks only Burmese as texted.
- African and Indonesian keep showing "Not texted" until each is individually checked.
- Undo works per meal too.
- The "Texted (all their meals)" wording is replaced with per-meal wording, e.g. "Texted Aug 7 · Myanmar (Burmese)".
- Counts on the committee page, Admin → Meal texts, and the Pre-pay notifications tracker are recalculated per meal instead of per guest, so "still needs a text" reflects actual outstanding meals.

Nothing is deleted: existing marks are carried over. Any guest already marked as texted keeps that mark on every meal they currently have, so no one loses history — from that point forward each meal tracks separately.

## Technical detail

1. New table `public.meal_text_sends` — `(preorder_id uuid references cuisine_preorders(id) on delete cascade, cuisine text, sent_at timestamptz, marked_by uuid, unique (preorder_id, cuisine))`, with GRANTs (`authenticated` select, `service_role` all), RLS enabled, staff/committee-scoped read policy; all writes go through server functions using the admin client.
2. Migration backfills one row per existing cuisine in `selections` for every pre-order whose `meal_text_sent_at` is not null, preserving the original timestamp. `meal_text_sent_at` column is retained (not dropped) as the historical record.
3. Reads: `src/lib/committee-meal-texts.server.ts`, `src/lib/meal-texts.functions.ts` (`getMealTextData`), and `src/lib/meal-notify.functions.ts` join `meal_text_sends` on `(preorder_id, normalized cuisine)` and set each row's `sent_at` from that join instead of `meal_text_sent_at`.
4. Writes: `markMyMealTextSent` and `markMealTextSent` take `{ preorderId, cuisine }` pairs instead of bare ids — upsert on mark, delete on undo. Committee ownership check stays as-is.
5. UI: `src/routes/_authenticated/admin/meal-texts-mine.tsx` and `.../meal-texts.tsx` pass the row's cuisine when marking, key busy state on `id+cuisine`, and update the badge wording. `src/components/meal-notify-tracker.tsx` counts pending meals.
6. Cuisine normalization reuses the existing Myanmar/African/Indonesian normalizer so the stored key always matches what the UI groups by.

## Verification before calling it done

Signed in on a phone-sized viewport as a committee member with a three-meal guest: mark Burmese texted, confirm African and Indonesian still read "Not texted", confirm the database has exactly one `meal_text_sends` row, then mark and undo each of the others and read the rows back.
