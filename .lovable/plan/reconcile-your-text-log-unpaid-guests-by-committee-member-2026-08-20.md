# Reconcile your text log + unpaid guests by committee member

## Getting your data to me

The paperclip upload isn't landing on my side, so we'll skip it: paste the rows straight into the chat as text (name, phone, cuisine, plates, whatever columns you have — header row included is helpful, but not required). Text paste always reaches me. If it's long, send it in a few messages and tell me when it's the last one.

I will not touch any code until your rows are in, so nothing gets built against guesses.

## Live numbers as of 2026-08-20 18:53 UTC

RSVP "yes", attending in person (the payment-chase list):

- 120 cuisine order lines · 152 plates
- Payment texts marked sent: 95 order lines
- Not marked sent: 25 order lines — 20 of those already have a payment recorded, so only 5 still actually need a text
- Paid/reported: 42 lines · Unpaid: 78 lines / 101 plates

## Unpaid plates by committee member (live)

| Committee member | Unpaid orders | Unpaid plates |
|---|---|---|
| Kari Gray | 22 | 31 |
| Tamara Madlock | 16 | 17 |
| Angela Waters | 10 | 15 |
| Tina Santana | 7 | 11 |
| Betsaida Ruiz | 7 | 7 |
| Shelley & Pat Monaghan | 5 | 7 |
| Mysha Woods | 5 | 6 |
| Mike and Tracey Curtis | 2 | 2 |
| Aisha Moore | 2 | 2 |
| Dixie Frahm | 1 | 2 |
| Jamy Elker | 1 | 1 |

## What I will do once your rows are pasted

1. **Line-by-line comparison** of your pasted list against the database, reported back as three explicit groups: in your list and in the database, in your list but missing/mismatched in the database, and in the database but not in your list. No summarizing away differences.

2. **Fix the mismatches in the database**, with each correction named: missing sent-marks added, wrong phone numbers corrected, missing preorders inserted. Nothing existing is deleted or overwritten — corrections are additive and the originals stay visible.

3. **A spreadsheet you can send to the committee** — one sheet per committee member listing every unpaid guest: name, phone, cuisine, plates, amount owed, and whether a payment text was marked sent and on what date. Plus a summary sheet with the table above and dollar totals, and a sheet for unpaid orders with no committee owner so nobody is dropped.

4. **The same list inside the app** so it stays current without spending credits: a new "Unpaid guests by committee member" section on `/admin/meal-texts` with a per-member breakdown and a CSV download button. Committee members keep seeing only their own guests on their own page.

5. **One source of truth for the counts** — the page header metrics and the export both read from the same server query, so they can never disagree again. I will verify the finished page on your phone-size view (384x681) and report the exact numbers back with a UTC timestamp.

## Technical notes

- New server function in `src/lib/meal-texts.functions.ts` returning unpaid rows grouped by `invitations.inviter_id -> inviters.name`, reusing the existing ledger so text/payment state matches the rest of the page.
- New presentational component `src/components/unpaid-by-committee.tsx`, rendered on `src/routes/_authenticated/admin/meal-texts.tsx`, using the existing CSV helper in `src/lib/download-file.ts`.
- Amounts come from `src/lib/meal-pricing.ts`, not hardcoded numbers.
- Any pasted-row corrections go in as a migration plus inserts, with the before/after row counts stated.
