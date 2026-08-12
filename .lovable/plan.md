# Remove Laquita Jones from every meal list

2026-08-12 15:47 UTC

## Confirmed current state

- Laquita Jones, (402) 208-6599, still has her retained preorder history row, but its meal selection is already empty (`[]`) as of 2026-08-12 11:49 UTC.
- Her RSVP remains **Yes, party of 1**, while `ordering_food` is already **false**.
- She has no meal-payment, restaurant-confirmation, meal-text, or Zelle-text records.
- The activity ledger confirms her former African, Indonesian, and Myanmar selections were cleared.

## What I will do

1. Trace every live meal surface that could still display her: admin meal report, restaurant order lists, committee meal lists, pre-pay/update text queues, and meal export.
2. Correct any screen that treats a retained empty-history row as an active meal order. Her name, phone, RSVP, and history will remain retained; she will not appear as ordering any meal.
3. Check for stale client data and ensure refresh/reload reads the cleared record instead of preserving an obsolete row.

## Verification before reporting the result

- Test the exact admin/committee meal routes at the current **384×681 mobile viewport**.
- Confirm Laquita is absent from African, Indonesian, and Myanmar active lists, restaurant portals, text queues, and the generated meal report.
- Read the database back again to confirm selections remain empty and `ordering_food` remains false, with RSVP Yes and party size 1 unchanged.
- If authenticated role access prevents any exact-route check, report that limitation instead of claiming full verification.

## Technical note

This is an active-list correction, not a deletion. The retained preorder row is the cancellation/history record and must not be erased.
