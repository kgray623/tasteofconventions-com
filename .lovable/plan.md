# Fix the counts on the Photo album texts page

You are right that the header numbers are wrong. The page is currently counting **invitations** (households), not **people**.

## What the database says right now

Read live at 20:31 UTC, Aug 31 2026, for RSVP = yes only:

| | Households (what the page shows now) | People / seats |
|---|---|---|
| In person | 133 | 247 |
| Zoom | 113 | 129 |

So the page's "133 in person / 113 Zoom" is a household count. Your 244 / 127 are people counts. The remaining small gap (247 vs 244, 129 vs 127) is almost certainly the duplicate-guest merging that the Admin overview already applies but this page does not — that is **not yet confirmed**, so confirming it is the first step.

## Steps

1. **Confirm the exact source of 244 / 127.** Run the Admin overview's own totals code (`computeRsvpRollup` + `buildDuplicateGroupIds` in `src/lib/rsvp-math.ts`) against live data and print its in-person and Zoom people counts. If it returns 244 and 127, that is the canonical math and the album page must use it. If it returns something else, report the actual numbers and identify which rows differ before changing any UI.

2. **Make the album page use the same canonical math.** Apply the same duplicate-identity grouping and party-size totals so the album page can never disagree with the Admin overview.

3. **Show both numbers clearly**, so nothing is hidden:
   - `244 people in person`
   - `127 people on Zoom`
   - `371 people total`
   - plus `246 phone numbers to text` (one text per household — a household of 4 still gets one text)

4. **Leave the list itself alone.** Still one row per phone number, alphabetical, Text / Mark sent / Undo unchanged. No guest is dropped.

5. **Verify before reporting.** Read the numbers back from the database and load the live page at phone width to confirm the header shows 244 / 127, then publish.

## Technical notes

- Change is in `src/lib/album-texts.server.ts` (totals only) and the header in `src/routes/_authenticated/admin/album-texts.tsx`; totals type gains `peopleInPerson`, `peopleZoom`, `peopleTotal`.
- Reuse `buildDuplicateGroupIds` / `computeRsvpRollup` rather than writing new counting logic, so the album page and the Admin overview share one source of truth.
- No changes to RSVP, meal, payment, or texting-state code.
