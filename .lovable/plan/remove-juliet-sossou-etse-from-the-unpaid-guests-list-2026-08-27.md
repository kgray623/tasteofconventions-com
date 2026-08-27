# Remove Juliet Sossou-Etse from the Unpaid guests list

Verified 2026-08-27 17:13 UTC.

## Current verified facts

- The active record is **Juliet Sossou-Etse**, phone **(402) 810-4177**, with **Indonesian ×2**.
- The database has a payment row for all **2 of 2 plates**, recorded as **committee-reported / restaurant direct** at 2026-08-27 17:02 UTC.
- Restaurant confirmation is still false, so Juliet may correctly remain visible under **Reported paid — awaiting restaurant confirmation** and on Koen’s confirmation list.
- The canonical meal ledger classifies a fully paid committee-reported order as `paid_reported`, and `/admin/unpaid` is intended to exclude both reported-paid and restaurant-confirmed rows.
- Therefore Juliet should not appear on `/admin/unpaid`. The precise live request/cache boundary causing the stale entry has not yet been confirmed.

## Execution plan

1. Capture the authenticated `/admin/unpaid` server-function request and returned Juliet row on the actual 390×844 admin view.
2. Trace the exact result through `getMyMealTexts` → the canonical meal ledger → `useMyUnpaidMeals`, including the query cache key and refresh behavior.
3. Correct only the stale boundary so a newly recorded full payment immediately removes that cuisine line from `/admin/unpaid`; preserve the payment row, restaurant-confirmation workflow, and every other meal screen.
4. Add a regression test for an Indonesian ×2 order with `qty_paid = 2`, `source = committee_recorded`, and `confirmed = false`; it must be `paid_reported` and absent from the unpaid result.
5. Verify end to end as Kari/admin at 390×844:
   - `/admin/unpaid` contains no Juliet or Sossou entry.
   - The unpaid guest/plate totals match a fresh database read-back.
   - `/admin/meal-texts` keeps Juliet only under **Reported paid — awaiting restaurant confirmation**.
   - Koen’s list retains Juliet for restaurant verification rather than falsely marking her restaurant-confirmed.
6. Report the final route results and UTC timestamp. Do not call it corrected unless the database, server response, and rendered page all agree.

## Scope

No payment, RSVP, invitation, meal quantity, referral, or restaurant-confirmation data will be changed. This is limited to removing a fully reported-paid order from the Unpaid guests display and preventing stale reappearance.
