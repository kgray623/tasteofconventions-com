# Record Stephanie Williams' meal payment

Verified against the live database 2026-08-23 03:07 UTC.

## What the database shows

- Invitation: **Stephanie Williams**, (402) 686-9238 — invited by **Mysha Woods**. The corrected number Mysha texted is already the number on file; no phone fix is needed.
- Meal order: **1 Myanmar (Burmese) plate**.
- `meal_payments`: **no row** for her order. `meal_order_status`: no restaurant confirmation either. So she is correctly showing unpaid.
- Burmese pricing on file: $21.80 chicken / $27.25 beef.

## Fix

1. Record one payment against her order: 1 Myanmar plate, `source = committee_recorded`, marked by Kari Gray, `paid_at` = 2026-08-22, method **PayPal**, note: "Paid via PayPal; reported by Mysha Woods (inviter) 8/22/2026."
2. Leave it **unverified** so it lands in the existing "Payments to verify" queue for the Burmese restaurant to confirm — never faking a restaurant confirmation.
3. Read the row back from the database and confirm she no longer appears on `/admin/unpaid`.
4. Report before/after committee-wide unpaid totals (households, order lines, plates).

If the payment actually came by Zelle or Venmo rather than PayPal, say so and the method on the row will be corrected — the plate count and totals are unaffected.

## Technical detail

- Uses the existing `recordMealPayment` helper in `src/lib/meal-payments.server.ts` (committee-record path). No new logic, no schema change, nothing overwritten.
- The helper resolves the Burmese `restaurant_id` from the cuisine, so the plate shows up in that restaurant's portal, and it refuses to weaken any existing restaurant confirmation.
