# Tina Santana payment + follow-up notes (2026-08-23 19:2x UTC)

## What the database shows right now

- **Tina Santana**, (402) 657-7364 — 1 African, 1 Indonesian, 2 Myanmar.
  African is already **restaurant-confirmed paid** (Lalibela, 8/20). Indonesian and
  Myanmar have **no payment row at all**.
- **Deshon Bradley**, 419-371-4774 — 2 African, 2 Indonesian, 2 Myanmar. No payment rows.
- **Tiana Stoddard**, (402) 202-8845 — 1 African, 1 Indonesian, 1 Myanmar. No payment rows.

## Fix

1. Record **1 Indonesian plate paid** for Tina Santana (Koen), source
   `committee_recorded`, marked by Kari Gray, `paid_at` = 2026-08-23, note:
   "Kari Gray confirmed 8/23/2026: paid Indonesian; Burmese not paid yet — Burmese
   restaurant closed today." Left **unverified** so Koen confirms it in his portal.
2. Leave her 2 Myanmar plates unpaid and visible (correct — she still owes them).
3. Nothing recorded as paid for Deshon Bradley or Tiana Stoddard — neither has paid.
   Their status is a follow-up, not a payment.
4. Read all rows back from the database and report before/after committee-wide unpaid
   totals (households, order lines, plates) with a UTC timestamp.

## Optional follow-up tracking (needs your OK)

There is no place today to record "promised to pay Wednesday" or "left voicemail" —
only actual payments. If you want, I can add a short **follow-up note** per unpaid
guest on `/admin/unpaid`, visible to the whole committee, so these read:

- Deshon Bradley — "Paying Wednesday 8/26 when his check arrives."
- Tina Santana (Myanmar) — "Burmese restaurant closed 8/23; will call when open."
- Tiana Stoddard — "Voicemail left 8/23, no answer yet."

Notes would never mark anyone paid and never hide anyone from the unpaid list.

## Technical detail

- Payment goes through the existing `recordMealPayment` path in
  `src/lib/meal-payments.server.ts`, which resolves Koen's `restaurant_id` from the
  Indonesian cuisine. No schema change, nothing deleted or overwritten.
- The follow-up notes option would add one small table plus a note field on the
  unpaid rows; it is additive only and only happens if you approve it.
