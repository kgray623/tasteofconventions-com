# Record Anita Lindell's second meal payment

Verified against the live database 2026-08-23 14:3x UTC.

## What the database shows

- Anita Lindell, (308) 258-4911 — order on file: **1 African plate (Lalibela) + 1 Myanmar plate (Burmese)**.
- `meal_payments`: **one row only** — 1 Myanmar plate, guest-reported 2026-08-21, method "other", still unverified.
- `meal_order_status`: no restaurant confirmation for either plate.
- So her **African plate has no payment record**, which is why she still shows on the Unpaid guests page.

## Taking her at her word

Her text: "I did and I also marked one meal paid instead of two. If I need to do it again please let me know. I paid for the Burmese meal on Thursday." Read plainly: she paid for both meals but only got one marked. So the missing African plate gets recorded as paid.

## Fix

1. Record one payment against her order: **1 African plate**, `source = guest_reported`, reported-by label "Anita Lindell", `paid_at` = 2026-08-20 (Thursday), note: "Guest reported by text 8/23/2026: paid both meals, only one got marked; Burmese paid Thursday."
2. Leave it **unverified** so it lands in the existing "Payments to verify" queue for Lalibela to confirm — never faking a restaurant confirmation. Her Myanmar row stays exactly as it is (unverified, waiting on Burmese).
3. Read the row back from the database and confirm she no longer appears on `/admin/unpaid`.
4. Report before/after committee-wide unpaid totals (households, order lines, plates) with a UTC timestamp.

## Technical detail

- Uses the existing `recordMealPayment` path in `src/lib/meal-payments.server.ts`; it resolves Lalibela's `restaurant_id` from the cuisine so the plate shows in that restaurant's portal.
- No schema change, no code change, nothing deleted or overwritten.
