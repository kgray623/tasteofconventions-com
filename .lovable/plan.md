# Fix meal cancellation errors and remove Gina's Burmese meal

2026-08-06 23:59 UTC

## Confirmed cause (verified in the database)

- Gina's meal record exists as **"Gina Rae Filer" — (402) 812-7437 — 1 Myanmar (Burmese)**, credited to committee member **Melissa Novotne**.
- When anyone sets their meals to **0** and taps **Save meal order**, the app tries to *delete* the pre-order row. A protection rule on that table blocks all deletes outside the admin delete flow, so the save always fails with "Something went wrong. Please try again."
- This affects every guest and every committee member, not just Gina — nobody can currently cancel a meal.

## Changes

1. **Cancel instead of delete.** Saving zero meals will keep the person's record and store an empty meal selection, so the order is cancelled without losing the person, their phone, or the history of the change. The immutable activity ledger still records who changed what and when.
2. **Cancelled orders drop out of the counts.** Meal totals, restaurant portals, pre-pay notification tracking, meal texts, and CSV exports will treat an empty selection as no meal ordered — no phantom orders left behind.
3. **Clear confirmation instead of an error.** Saving zero meals shows "Meal order cancelled" instead of a failure toast.
4. **Remove Gina's Burmese meal.** Her 1 Myanmar (Burmese) meal is cancelled, keeping her record and RSVP intact and credited to Melissa Novotne.
5. **Also harden the public pre-order page** so a guest who submits meals a second time updates their existing order rather than erroring on a duplicate.

## Verification before I call it done

- Read Gina's row back from the database: record present, meals empty, RSVP and committee credit unchanged.
- Confirm the Burmese/Myanmar order count drops by exactly 1 and that Gina no longer appears on the Burmese restaurant order list or the pre-pay text list.
- Test at the exact **384x681 mobile viewport** on `/my-rsvp` and on an invitation link `/rsvp/<token>`: set meals to 0, save, reload, confirm 0 stays and no error appears.
- Test setting meals back to 1 and saving again, to prove cancel is reversible.

## Technical notes

- `submitCuisinePreorder` in `src/lib/invitations.functions.ts`: replace the delete branch with an upsert of `selections: []`.
- `submitStandaloneCuisinePreorder`: change the insert to an upsert on `invitation_id`.
- Verify empty-selection handling in `src/lib/restaurant-portal.server.ts`, `src/lib/meal-notify.functions.ts`, `src/lib/meal-texts.functions.ts`, `src/lib/committee-meal-texts.server.ts`, and `src/routes/_authenticated/admin/preorders.tsx`.
- Gina's data correction is a data update (selections emptied), not a row deletion — nothing is dropped.
