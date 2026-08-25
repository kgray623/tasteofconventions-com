# Record Lori McLaren's African plate payment

Timestamp: 2026-08-25 14:30 UTC

## What was verified in the database

Lori McLaren (phone 4022131461) has one preorder record with two plates:

- Indonesian, 1 plate — already paid, marked by the restaurant (Koen) on 2026-08-13, verified
- African, 1 plate — no payment row yet, so she shows as unpaid

Both cuisines already have "text sent" marks from 2026-08-07.

## Change

Add one payment row for the African plate only:

- 1 plate
- Source: guest-reported (unverified), pending restaurant confirmation
- Note: "Reported paid to Kari 2026-08-25; awaiting restaurant verification"
- Restaurant linked automatically from the African cuisine, so it appears in that restaurant's portal
- Paid timestamp: now

Nothing else changes. The existing Indonesian payment, her plate counts, and all text/sent marks stay exactly as they are.

## Expected result after the change

- Lori McLaren disappears from the unpaid list on /admin/unpaid and from the unpaid-by-committee rollup
- Paid-plate total increases by 1; still-to-pay total decreases by 1
- The African restaurant portal shows her plate as reported, not yet verified

## Technical detail

Insert into `meal_payments` for `preorder_id = 84d721a9-6db8-47a0-91a5-832d7ca0ef4e`, `cuisine = 'African'`, `qty_paid = 1`, `source = 'reported'`, with `restaurant_id` resolved from the African restaurant row and `verified_at` left null. No schema or code changes. Row counts read back after the insert and reported.
