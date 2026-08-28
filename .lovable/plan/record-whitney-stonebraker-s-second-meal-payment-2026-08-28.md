# Record Whitney Stonebraker's second meal payment

Verified 2026-08-27 23:05 UTC.

## Current verified facts

- Text is from **(402) 707-5335** = **Whitney Stonebraker**, invitation `a8e9ac8c…`, preorder `25358151…`.
- Her order: **Indonesian ×1** and **Myanmar ×1**.
- `meal_payments` has one row: **Myanmar ×1**, guest-reported, paid 2026-08-25, not yet restaurant-verified.
- So "the 2nd meal" is the **Indonesian ×1** plate, which is still unpaid.

## Execution plan

1. Record a payment for the Indonesian ×1 plate through the existing payment path so `meal_payments` and `meal_order_status` stay in sync:
   - `qty_paid = 1`
   - `source = guest_reported`, method **restaurant direct**
   - note: guest texted "I just paid for the 2nd meal", 2026-08-27
2. Leave restaurant confirmation as **not confirmed**, so Koen still verifies it. No existing Myanmar payment or confirmation data is touched.
3. Read back from the database: both payment rows and the matching `meal_order_status` rows.
4. Verify at 390×844 as Kari/admin:
   - `/admin/unpaid` no longer lists Whitney Stonebraker, with refreshed guest/line/plate totals matching a fresh database count.
   - `/admin/meal-texts` shows both of her plates as reported paid, awaiting restaurant confirmation.
5. Report exact route numbers with a UTC timestamp.

If she actually paid by Zelle, Venmo, Cash App, or cash rather than directly to the restaurant, tell me and I'll record that method instead.

## Scope

Only this one payment record is added. No RSVP, quantity, referral, or other guest data changes.
