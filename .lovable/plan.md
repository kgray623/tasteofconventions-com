# Chanel Jones — record both plates paid

Read from the live database 2026-08-25 21:24 UTC.

## Why Whitney is still on the list

Whitney Stonebraker (402-707-5335) has **two** plates:

- Myanmar — recorded paid 2026-08-25 (guest-reported, awaiting restaurant verification)
- Indonesian — **still unpaid**, per her own text: "Indonesian is the plate still to be paid, the restaurant is calling her"

So her appearance on the unpaid list is correct and nothing about her record changes. No edit planned for her.

## What changes

Chanel Jones (213-909-7589, Tamara Madlock's guest) has 1 African (Lalibela) plate and 1 Myanmar (Burmese) plate, with **no payment rows at all** right now. Her text: "I've paid for my meal."

1. Record **1 African plate as paid** — guest-reported, awaiting restaurant verification, restaurant linked to Lalibela.
2. Record **1 Myanmar plate as paid** — guest-reported, awaiting restaurant verification, restaurant linked to the Burmese restaurant.
3. Add a follow-up note on each plate: "Chanel Jones reported by text 2026-08-25 4:22 PM that her meal is paid. Recorded for both plates as guest-reported; awaiting restaurant verification."
4. Her existing notes ("Sent"), order lines, RSVP and text history stay exactly as they are — nothing deleted or overwritten.

## Expected result

- Chanel Jones drops off the unpaid list entirely (both plates move to "Reported paid — awaiting restaurant confirmation")
- Paid plates increase by 2; still-to-pay decreases by 2
- Both restaurant portals show her plate as reported, not yet verified

## Technical detail

Two inserts into `meal_payments` for `preorder_id = cd575b3b-1f66-4cbe-86d6-a1fcf90ba593` (`cuisine = 'African'` and `'Myanmar'`, `qty_paid = 1`, `source = 'guest_reported'`, `verified_at` null, `restaurant_id` resolved per cuisine), plus two `meal_follow_up_notes` rows. No schema or code changes. Totals re-read from the database afterwards and reported with a UTC timestamp.
