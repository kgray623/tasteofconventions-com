# Whitney Stone — resolve which plate is paid

Timestamp: 2026-08-25 14:48 UTC

## What the screenshot settles

Whitney Stone (402-707-5335) confirms the meal still left to pay is **Indonesian**. So the one she already paid is her **Myanmar** plate.

## What the database shows now (read 2026-08-25 14:48 UTC)

- One preorder: Indonesian 1 plate, Myanmar 1 plate
- **No payment rows at all** — both plates currently count as unpaid
- Two follow-up notes (one per plate) from earlier today saying "paid for 1 meal, confirm which plate"

## Change

1. Record **1 Myanmar plate as paid** — guest-reported (unverified), restaurant linked from the Myanmar restaurant, note: "Whitney Stone confirmed by text 2026-08-25: Myanmar plate paid; Indonesian still to be paid (restaurant calling her)."
2. Replace the two ambiguous follow-up notes with clear ones:
   - Myanmar: paid, awaiting restaurant verification
   - Indonesian: still owed; restaurant is calling her to process payment
3. Nothing is deleted: her plate counts, RSVP, and text-sent history stay exactly as they are, and the old note text is superseded rather than her data removed.

## Expected result after the change

- Whitney's Myanmar plate leaves the unpaid list; her Indonesian plate stays on it with a clear note
- Paid plates go from 114 to 115; still-to-pay goes from 34 to 33
- The Myanmar restaurant portal shows her plate as reported, not yet verified

## Technical detail

Insert one row into `meal_payments` for `preorder_id = 25358151-ae0a-4b19-ada0-74fe3fdf5e6e`, `cuisine = 'Myanmar'`, `qty_paid = 1`, `source = 'reported'`, `verified_at` null, `restaurant_id` resolved from the Myanmar restaurant row. Update the two `meal_follow_up_notes` rows for that preorder. No schema or code changes. Counts read back from the database and reported after the write.
