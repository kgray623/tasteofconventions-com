# Make the updated guest text wording actually stick

Plan written 2026-08-10 21:1x UTC.

## What I found (verified in the database just now)

- The wording used by every "Text" button is the **Payment update wording** box on Admin → Meal texts. It is stored under the key `meal_zelle_text_template`.
- **That row does not exist in the database.** Nothing has ever been saved from that box, so every text still falls back to the built-in default wording — which is why your edit isn't showing.
- The only saved wording row is an older one (`meal_text_template`, last saved Aug 8 20:22 UTC) and it is **not used** when building the texts anymore.

So your typed edit was lost: either "Save wording" wasn't tapped, or the save failed and the page reloaded the default. I have not yet confirmed which — proving that is step 1.

## What I'll do

1. **Prove the save path end-to-end** on the real page at your phone size (384px): type a marker line, tap "Save wording", read the row back from the database, reload the page, and confirm the marker is still there and appears in the actual text a guest would receive.
2. **Fix whatever step is broken** in that chain (save handler, key written, or the reload overwriting your text) so saved wording persists.
3. **Make lost edits impossible to miss**: the wording box shows "Unsaved changes" the moment you type, "Saved HH:MM UTC" after a successful save, and a plain error if the save fails. The Save button stays enabled while there are unsaved edits.
4. **One wording everywhere**: the committee page (My meal texts) and the admin page both read the same saved wording, and the committee page refreshes it on open so it can never show older wording than admin.
5. **Retire the confusing second row**: keep the Aug 8 `meal_text_template` value stored (nothing is deleted) but stop it from looking like live wording, so there is only one editable message.

Nothing about prices, Zelle/Venmo details, photo links, guest lists, or the texted/paid checkmarks changes.

## Before I build it — one thing to confirm

I do not have the wording you typed, since it was never saved. Paste the exact message you want as the live guest text and I'll load it as the saved wording as part of this change; otherwise I'll fix the save mechanism and you can paste it into the box yourself.

## Technical notes

- `src/routes/_authenticated/admin/meal-texts.tsx`: the wording card writes `kind: "zelle"` → `app_settings.meal_zelle_text_template` via `saveMealTextTemplate`. Add dirty/saved state, surface save errors, and refresh from the server after a successful save.
- `src/routes/_authenticated/admin/meal-texts-mine.tsx`: already renders `zelleTemplate`; ensure it refetches on mount/focus.
- `src/lib/meal-texts.functions.ts` (`getMealTextData`, `saveMealTextTemplate`) and `src/lib/committee-meal-texts.server.ts` stay the single source; verify the upsert with a `select` read-back after saving.
- Verification: `supabase--read_query` on `app_settings` plus Playwright at 384x681 on `/admin/meal-texts` and `/admin/meal-texts-mine`, checking the rendered message body for each cuisine.
