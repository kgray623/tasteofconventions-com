# Record Dixie Frahm's meal payment

## What the database actually shows (checked 2026-08-23 00:30 UTC)

- Dixie's order: `MsDixie L. Frahm`, 402-979-5214 — **1 Indonesian plate (Koen)**.
- `meal_payments`: **no row at all** for her order.
- `meal_order_status`: **no row** — Koen never checked her off either.
- Koen has logged 27 payments and 23 confirmations for other guests, so their portal is in use; her payment simply was never entered anywhere.

So the Unpaid guests page is reading correctly. Nothing is broken in the ledger — the payment is missing from the record.

## Fix

1. Record one payment for her order: 1 Indonesian plate, `source = committee_recorded`, marked by you (Kari Gray), `paid_at` = Sunday Aug 16, 2026, method Zelle, note: "Zelle paid in person Sunday, witnessed by Kari Gray; awaiting Koen confirmation."
2. Leave it **unverified** so it lands in the existing "Payments to verify" queue for Koen to confirm — that keeps the restaurant's own count honest instead of silently claiming they confirmed it.
3. Read the row back and confirm the Unpaid guests page no longer lists her, and that her plate now appears as paid/reported in the Koen portal.
4. Report the before/after unpaid totals (households, order lines, plates).

Chicken vs beef does not need to be known: the payment record tracks plates paid, not the dollar amount. If Koen tells you which plate it was, her order line can be corrected separately.

## Technical detail

- Use the existing `recordMealPayment` helper in `src/lib/meal-payments.server.ts` via the committee-record path — no new logic, no schema change, nothing overwritten.
- It already refuses to weaken an existing restaurant confirmation and reads the row back before reporting success.
