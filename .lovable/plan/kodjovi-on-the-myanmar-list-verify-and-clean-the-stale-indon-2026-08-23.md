# Kodjovi on the Myanmar list — verify and clean the stale Indonesian trace

Timestamp: 2026-08-23 00:12 UTC

## What the database says right now

The household "Delali & Kodjovi Pinto" (402-306-9752) is already recorded entirely as Myanmar:

- Pre-order: 2 Myanmar plates (updated Aug 22, 18:36 UTC), no Indonesian line
- RSVP: yes, in person, party of 2, ordering food
- Payment: 2 Myanmar plates, verified Aug 20, linked to the Burmese restaurant
- Restaurant portal logic only lists a household under the restaurant whose cuisine matches its own pre-order lines, so this order can only appear under Burmese/Myanmar

One leftover trace exists: a payment-text "sent" mark dated Aug 12 for **Indonesian**, from before the order was changed to Myanmar. That is the only Indonesian-side reference to this household anywhere in the data.

## What to do

1. Read back the live Burmese (Myanmar) restaurant portal and Koen (Indonesian) portal for this household, and report the actual rows and meal counts each portal returns — proof of which list he lands on, not an assumption.
2. If the Koen/Indonesian side shows him anywhere (portal row, meal count, or a "texted" list), trace that exact read and fix the grouping so it keys off the household's current pre-order cuisine only.
3. Retire the stale Indonesian payment-text mark for this household so no Indonesian screen references him. Nothing is deleted from the audit trail — the reversal is recorded, consistent with the existing text-event history.
4. Re-read the database and both portals after the change and report exact plate counts per restaurant.

## Technical notes

- Verification: `cuisine_preorders`, `rsvps`, `meal_payments`, `meal_order_status`, `meal_zelle_text_sends`, `meal_text_events` for preorder `b0f2cbc3…`.
- Portal read path: `loadPortalData` in `src/lib/restaurant-portal.server.ts` (filters by `sel.cuisine !== cuisine`).
- The Indonesian mark cleanup is a data change recorded as a reversal event, not a row deletion, so the "sent/paid marks only from a human action" rule stays intact.
- No schema changes.

## If he should be somewhere he is not

If your point is that he is **missing** from the Myanmar count you are looking at, say which screen (Burmese restaurant portal, admin meal counts, or the preorders page) and step 1 will show whether that screen's read is dropping him.
