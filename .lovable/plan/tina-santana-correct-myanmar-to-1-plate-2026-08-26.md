# Tina Santana — correct Myanmar to 1 plate

Read from the live database 2026-08-26 13:57 UTC.

## What the database shows now

Tina Santana (402-657-7364), preorder `9a57ad22…`:

- African — 1 plate, restaurant-confirmed paid
- Indonesian — 1 plate, restaurant-confirmed paid
- Myanmar (Burmese) — **2 plates ordered**, 2 recorded paid (guest-reported, 2026-08-26)

Your correction: she has **1 plate at each restaurant**, so the Myanmar line of 2 is wrong.

## What changes

1. Change her Myanmar order quantity from **2 to 1**.
2. Change her Myanmar payment record from **2 plates paid to 1 plate paid** (still guest-reported, awaiting restaurant verification, same paid timestamp and restaurant link).
3. Add a follow-up note on the Myanmar line: "Corrected 2026-08-26 per Kari: Tina Santana has 1 plate at each restaurant. Myanmar reduced from 2 plates to 1 (order and payment)." Her existing Myanmar note history is preserved, not overwritten.
4. African and Indonesian confirmations, her RSVP, text history and all other notes stay exactly as they are.

## Expected result

- Tina Santana: 3 plates total (1 African, 1 Indonesian, 1 Myanmar), all paid/reported
- Total active plates drop by 1; paid/reported plates drop by 1
- Still-to-pay count unchanged
- Burmese restaurant portal shows 1 reported plate for her, not 2

## Technical detail

Update `cuisine_preorders.selections` for that preorder so the Myanmar entry is `qty: 1`, and update the `meal_payments` row (`cuisine = 'Myanmar'`) to `qty_paid = 1`. Insert/append one `meal_follow_up_notes` entry. No schema or code changes. Totals re-read from the database afterwards and reported with a UTC timestamp.
