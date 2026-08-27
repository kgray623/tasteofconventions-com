# Record Kenda Andersen's meal payment

Verified 2026-08-27 19:34 UTC.

## Current verified facts

- **Kenda Andersen**, phone **(402) 296-9922**, credited to **Kari Gray**.
- Invitation `4b7436b1…`, preorder `980c744c…`, order **Indonesian ×1**.
- `meal_payments` has **no row** for this preorder, so she currently shows as unpaid.

## Execution plan

1. Record a payment for the Indonesian ×1 plate through the existing payment path so `meal_payments` and `meal_order_status` stay in sync:
   - `qty_paid = 1` (full order)
   - `source = committee_recorded`, method **restaurant direct**
   - note: reported paid by Kari, 2026-08-27
2. Leave restaurant confirmation as **not yet confirmed**, so she stays on the restaurant's verification list until the restaurant confirms — no payment or confirmation data is invented.
3. Read back from the database: her payment row, `qty_paid = 1`, and the matching `meal_order_status` row.
4. Verify at 390×844 as Kari/admin:
   - `/admin/unpaid` no longer lists Kenda Andersen, with refreshed guest/plate totals matching a fresh database count.
   - `/admin/meal-texts` shows her under **Reported paid — awaiting restaurant confirmation**.
   - The Indonesian restaurant list still shows her plate for verification.
5. Report exact route numbers with a UTC timestamp.

If she actually paid by Zelle, Venmo, Cash App, or cash rather than directly to the restaurant, tell me and I'll record that method instead.

## Scope

Only this one payment record is added. No RSVP, quantity, referral, or other guest data changes.
