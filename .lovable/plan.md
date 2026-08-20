# Reconcile your Indonesian sheet with the live data

I read your screenshot (rows 31–49) and checked every visible name against the database. Verified as of 2026-08-20 19:15 UTC.

## What already matches

All four green rows are recorded as paid in the database, so green = paid is already in sync:

- Tonya and Jim Lucas — Indonesian x2 paid
- Danielle Walther — African, Indonesian, Myanmar all paid
- Melanie Dotsen — Indonesian, Myanmar paid
- Ava & Joel Brix — Indonesian, Myanmar paid

Every other visible name exists in the database with the same plate count as your sheet. Le Ann Bennett shows 1 Indonesian plate on your sheet but her RSVP is "no" and she has no meal order on file, so she correctly stays out of the pay-chase list.

## Real problems the comparison found

1. **Phone numbers are stored in four different formats** — `4026376187`, `14026760738`, `+1 402-657-7364`, `(402) 838-0063`. Anything that matches a person by phone (your sheet, a paste, a lookup) misses them depending on format. This is the root cause of names that "aren't on the list."
2. **Name spellings drift from your sheet** — "Melissa Novotne" vs `Melissa Novotny`, "Nathan Blaine" vs `Nate Blaine`, `Dee  Anna Gotschall` (double space), `Rahul kumar` (lowercase). Sorting and searching by name splits the same person.
3. **Payment-text marks recorded against cuisines the person never ordered** — Rahul Kumar is marked texted for African and Myanmar but only ordered Indonesian; Nate Blaine is marked texted for Myanmar but ordered Indonesian. These inflate the "texted" count against orders that do not exist.

## What I will do

1. **Normalize phone storage** for meal orders, invitations and inviters to bare 10-digit form, with a database-side trigger so new rows can't reintroduce the mixed formats. Existing rows get backfilled; nothing is deleted, and the original value is archived first.
2. **Fix the four name spellings** to match your sheet exactly (Melissa Novotny → Melissa Novotne, Nate Blaine → Nathan Blaine, collapse the double space, capitalize Kumar). Names come from your sheet, not from me guessing.
3. **Retire the orphan text marks** — the African/Myanmar marks for Rahul Kumar and the Myanmar mark for Nate Blaine are moved to an archived state, not deleted, so the texted count only counts real orders. This will slightly change the header numbers; I will report the before/after.
4. **Add a paste-and-compare tool** on `/admin/meal-texts`: paste rows from your sheet (name, phone, plates), and it shows, side by side, who is in your sheet but not the database, who is in the database but not your sheet, and every plate-count difference. Read-only — it reports, it never overwrites your data. This means you never have to wait on me to run the comparison again.
5. **Re-verify and report** the exact totals from the database after the fixes, on the real `/admin/meal-texts` route at phone width, and regenerate the unpaid-by-committee spreadsheet so it matches.

## Technical notes

- Phone normalization: migration backfilling `cuisine_preorders.phone`, `invitations.guest_phone`/`guest_phone_normalized`, `inviters.phone`, plus a `BEFORE INSERT OR UPDATE` trigger. Rows archived to `deleted_rows_archive` before update.
- Orphan text marks: add an `archived_at` column to `meal_zelle_text_sends` rather than deleting rows; the ledger query in `src/lib/meal-texts.functions.ts` filters archived marks out.
- Compare tool: new `src/components/sheet-compare.tsx` plus a read-only server function that returns the current roster; parsing and diffing happen client-side from your pasted text.
