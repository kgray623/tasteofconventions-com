# Texts sent / left + unpaid guests by committee member

## Live numbers (read from the database 2026-08-20 18:53 UTC)

Counting only orders that are attending in person with RSVP "yes" (the chase list):

- 120 cuisine order lines · 152 plates
- Payment texts marked sent: 95 order lines
- Payment texts still to send: 25 order lines
  - of those, 5 are both unpaid and never texted (the "5 orders still needing a payment text" figure)
  - the other 20 already have a payment recorded, so they need no text
- Paid/reported: 42 order lines
- Unpaid: 78 order lines · 101 plates

Short answer: 95 texts sent, 25 not yet marked sent, and only 5 of those actually still need to go out.

The header on the page says 119 orders / 151 plates / 45 paid because it also counts a couple of rows differently after last night's corrections; part of this work is making the header read from the same single query as the export so the two can never disagree.

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

## What I will build

1. **A document you can send out** — an XLSX saved to your documents folder with:
   - one sheet per committee member, listing every unpaid guest: guest name, phone, cuisine, plates, amount owed, whether a payment text was marked sent and on what date
   - a summary sheet with the table above plus dollar totals
   - a sheet of unpaid orders with no committee owner, so nobody is dropped

2. **The same list inside the app** (so it stays current without spending credits): a new section on `/admin/meal-texts` called "Unpaid guests by committee member" with a per-member breakdown and a CSV download button. Committee members already see only their own guests on their own page; this admin view shows all of them.

3. **One source of truth for the counts** — the header metrics and the export both come from the same server read, and I will state the exact numbers back to you after verifying them on the live page at 384x681.

Nothing is deleted, hidden, or overwritten; excluded (declined / Zoom) orders stay visible in their existing read-only section.

## Technical notes

- New server function in `src/lib/meal-texts.functions.ts` returning unpaid rows grouped by `invitations.inviter_id -> inviters.name`, reusing the existing ledger so payment/text state matches the rest of the page.
- New presentational component `src/components/unpaid-by-committee.tsx`, rendered on `src/routes/_authenticated/admin/meal-texts.tsx`, using the existing CSV download helper in `src/lib/download-file.ts`.
- Amount owed uses the stored meal pricing in `src/lib/meal-pricing.ts` ($20 chicken / $25 beef style per-cuisine pricing), not hardcoded numbers.
- The XLSX is generated from a live database read at build time and written to your documents folder.
