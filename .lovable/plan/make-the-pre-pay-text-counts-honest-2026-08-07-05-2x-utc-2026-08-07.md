# Make the pre-pay text counts honest (2026-08-07 05:2x UTC)

## What the database actually says right now

- 120 restaurant meals across 75 guests (153 total meal quantities)
- 76 meals marked texted, 44 still pending
- Of those 76 marks, **44 rows across 17 guests are copies**: one old per-guest mark was
  duplicated onto every cuisine that guest ordered, all sharing a single identical timestamp.
  Those are the "already texted" marks you never actually sent.

## The correction

1. Remove the 44 copied marks (the 17 guests whose meals all share one identical timestamp).
   Nothing is lost — the archive trigger keeps every removed row in Recently deleted, and the
   original `cuisine_preorders.meal_text_sent_at` history stays untouched.
2. Genuine per-meal marks (32 rows, including single-cuisine guests) stay exactly as they are.
3. After the cleanup the numbers become: 120 restaurant meals, 32 texted, 88 still needing a
   pre-pay text — and every one of those 88 clears only when a person checks it.

## Stop it recurring

- A guard in the mark-sent server functions so one action can only ever write one
  (guest + cuisine) pair — no bulk copying across a guest's other meals.
- The pre-pay card, Admin -> Meal texts, and the committee page all read the same per-meal
  source, so the three screens cannot disagree.

## Wording fix on the card

The headline reads the total as if everything were pending. It becomes:
"88 of 120 restaurant meals still need a pre-pay text", with separate badges for
"32 texted" and "153 meals ordered" (quantities, not orders) so the numbers can't be
misread as the same thing.

## Verification before I call it done

On a phone-sized viewport, signed in as admin and again as a committee member:
read the card, Admin -> Meal texts, and the committee page, confirm all three show the same
texted/pending split, and read the same numbers back out of the database with a query.
Then mark one meal texted, confirm only that meal changes, and undo it.
