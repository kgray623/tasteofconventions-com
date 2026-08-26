# Tina Santana — record her Burmese (Myanmar) plates paid

Read from the live database 2026-08-26 13:26 UTC.

## What the database shows now

Tina Santana (402-657-7364) has three cuisine lines:

- African — 1 plate, restaurant-confirmed paid (2026-08-24)
- Indonesian — 1 plate, restaurant-confirmed paid (2026-08-24)
- Myanmar (Burmese) — **2 plates, no payment recorded at all**

Her text ("Yes I was, I got all three restaurants taken care of") settles the outstanding Burmese line.

## What changes

1. Record **2 Myanmar plates as paid** for her preorder — guest-reported, awaiting restaurant verification, restaurant linked to the Burmese restaurant.
2. Add a follow-up note: "Tina Santana confirmed by text 2026-08-26 8:24 AM that all three restaurants are taken care of. Burmese (2 plates) recorded as guest-reported; awaiting restaurant verification."
3. Nothing else is touched — her African and Indonesian confirmations, order lines, RSVP, notes and text history stay exactly as they are.

## Expected result

- Tina Santana drops off the unpaid list entirely
- Plates paid/reported increases by 2; plates still to pay decreases by 2
- The Burmese restaurant portal shows her 2 plates as reported, not yet verified

## Technical detail

One insert into `meal_payments` for `preorder_id = 9a57ad22-be2d-439b-adb0-2d055547c6d2` with `cuisine = 'Myanmar'`, `qty_paid = 2`, `source = 'guest_reported'`, `verified_at` null, `restaurant_id` resolved to the Burmese restaurant, plus one `meal_follow_up_notes` row. No schema or code changes. Totals re-read from the database afterwards and reported with a UTC timestamp.
