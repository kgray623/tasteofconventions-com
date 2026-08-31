# Remove the chatty commentary text, and fix the album page counts

Two things, both scoped to display text and numbers only. No guest, RSVP, meal, payment, or texting data is touched.

## 1. Remove the chatty explanation text (asap)

These read like me talking to you and will be deleted from the screens:

- Admin overview / RSVP totals card (`src/components/rsvp-totals-card.tsx`):
  - "Only in-person guests use spots. Not everyone you invite will say yes, so plan to invite more guests than your approved in-person spots."
  - The prose sentence "In-person attendees in the building: 247 of 550 seats. Seats remaining: 303. Zoom attendees: 129 — unlimited, doesn't use seats." — replaced by plain labeled figures (Seats remaining: 303) with no narration.
  - The yellow "Data quality" box ("3 rows had an invalid party size…") is removed from the card.
- "Read from the database … UTC" badges and "Reading the guest list from the database…" lines on: album texts, covered dish, Burmese recheck, unpaid-by-committee, meal payments to verify, committee meal payments.
- The instructional paragraphs on the texting pages ("Tap Text to open your own Messages app…", "Duplicate phone numbers are only listed once…") reduced to nothing; the buttons speak for themselves.

What stays: every number, every count badge, every guest row, every button. Only the narration goes.

## 2. Fix the counts on the Photo album texts page

Your Admin overview shows **247 in-person / 129 Zoom**, and the database confirms exactly those figures for RSVP = yes. The album page was showing household counts (133 / 113) instead of people.

The album page header will show:
- `247 in person`
- `129 Zoom`
- `376 people total`
- `246 phone numbers to text` (one text per household — a household of 4 gets one text)

The list itself is unchanged: one row per phone number, alphabetical, Text / Mark sent / Undo.

## 3. Verify, then publish

Read the numbers back from the database, confirm the header matches 247 / 129, load the page at phone width to confirm the commentary is gone, then publish.

## Also noticed

Your screenshot shows "Audit failed to load: Failed to fetch" above the totals. That is a separate broken panel on the Admin overview. Say the word and I will fix it next; it is not part of this change.

## Technical notes

- Text removal: `src/components/rsvp-totals-card.tsx` (drop `DataQualityWarnings` usage and the italic footer), plus the badge/intro lines in `src/routes/_authenticated/admin/{album-texts,covered-dish,burmese-unpaid-recheck}.tsx` and `src/components/{unpaid-by-committee,meal-payments-to-verify,committee-meal-payments}.tsx`.
- Counts: `src/lib/album-texts.server.ts` totals gain `peopleInPerson`, `peopleZoom`, `peopleTotal`, computed with the same `buildDuplicateGroupIds` + `computeRsvpRollup` math the Admin overview uses, so the two screens can never disagree.
- No schema changes, no data writes.
