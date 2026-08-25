# Autumn Carlson — record the African plate as paid

Verified against the live database 2026-08-25 18:56 UTC.

## What the text thread says

The thread is with (402) 460-8121 — "Perry & Autumn". Kari sent the Zelle number 808.278.7562, and Autumn replied "You should have it! Thank you so much for your help! This was the meal my daughter really wanted!" — confirming she sent payment for the meal still outstanding.

## What the database shows now

Autumn Carlson, 402-460-8121 — order on file: African 1, Indonesian 2, Myanmar 1.

- Indonesian 2 — already recorded paid (guest-reported, Venmo, 8/24)
- Myanmar 1 — already recorded paid (guest-reported, Zelle, 8/24)
- **African 1 — no payment row; still unpaid.** Follow-up note "Sent" from today 14:46 UTC.

Payment texts were sent for all three cuisines on 8/8 and again 8/12.

## Change

1. Record her **1 African plate** as paid — guest-reported, method **Zelle**, awaiting restaurant confirmation, with the African restaurant linked so it appears in that restaurant's portal.
   - Note: "Autumn Carlson confirmed by text 2026-08-25 that she sent the Zelle for the African plate (808.278.7562). Awaiting restaurant verification."
2. Replace the ambiguous "Sent" follow-up note on the African line with that clear wording.
3. Nothing else changes: her Indonesian and Myanmar payments, plate counts, RSVP, and full text history stay exactly as they are.

## Expected result after the change

- Autumn Carlson drops off the unpaid list on /admin/unpaid and out of the unpaid-by-committee rollup entirely
- She appears under "Reported paid — awaiting restaurant confirmation"
- Paid plates go up by 1; still-to-pay goes down by 1
- The African restaurant portal shows her plate as reported, not yet verified

## Technical detail

Insert one row into `meal_payments` for `preorder_id = 10c2b7c0-33bb-4fc6-8c65-8517579a4ed7`, `cuisine = 'African'`, `qty_paid = 1`, `source = 'guest_reported'`, `method = 'zelle'`, `verified_at` null, `restaurant_id` resolved from the African restaurant row. Update the matching `meal_follow_up_notes` row. No schema or code changes. All counts read back from the database and reported with a UTC timestamp.
