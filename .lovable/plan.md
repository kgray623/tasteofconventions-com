# Fix the meal-text math: everyone needs the update except those already paid

## What the database actually says (read 2026-08-09 20:40 UTC)

- 117 restaurant-order units (one guest + one cuisine each).
- 4 of those units are recorded as paid in the payments ledger.
- 2 units are marked confirmed by a restaurant.
- 0 payment-update texts have been recorded as sent.

So the real number to text is 117 minus the paid/confirmed ones = 113, not 52.

## What is wrong today

The dashboard splits the 117 into "52 need the payment update" and "65 have received nothing," because it treats the original-message history as a gate: only guests with an original send were considered eligible for the update. That is the wrong rule. Every guest who ordered a meal needs the payment update text, regardless of whether they got the earlier message.

## The corrected rule

Each order unit lands in exactly one state:

1. **Paid** — a payment row or restaurant confirmation exists. No text needed.
2. **Needs the payment update** — not paid, and no payment-update send recorded. This is the texting queue.
3. **Update already sent** — not paid, and a payment-update send is recorded.
4. **Accounting exception** — missing phone, unlinked order, or a duplicate key. Shown, never hidden.

Paid wins over everything, so a guest never gets chased for money they already sent.

The old "has received nothing" vs "needs update" split disappears as a queue. Original-message history stays fully intact and is shown as reference-only history on each row, never as a filter.

## What changes on screen

- **Admin Overview tracker**: one primary number — "Still need the payment text" (113 right now) — plus small counts for Paid, Update sent, and Exceptions. Totals must sum to 117 or a warning shows instead of a number.
- **Admin Meal texts**: single working queue of everyone still needing the update, with each row showing guest, cuisine, quantity, committee owner, whether they got the original message, and paid status. Filters for Paid and Update sent are secondary views, not the default.
- **My meal texts (committee)**: same rule scoped to that member's guests, so nobody is told "you have 21 untexted" while the list shows something different.
- **CSV downloads** on both screens export exactly the rows shown.
- Marking the update sent stays a single explicit per-guest, per-cuisine action, written to the payment-update ledger only, with an immediate database read-back before any count changes.

## Verification before this is called done

- Read back from the database: Paid + Needs update + Update sent + Exceptions = 117 exactly.
- Confirm the queue count equals 113 and that the 4 paid units are absent from it.
- On the admin route and the committee route, at your viewport, mark one guest sent, confirm only that row moves, the ledger row exists, totals still reconcile, and Undo restores it.
- Confirm no send history was deleted: the 54 original-message marks remain readable.

## Technical details

- Extend `src/lib/meal-communication.ts` to join `meal_payments` and `meal_order_status` and reclassify states as above; `original_sent_at` becomes display-only.
- `src/lib/meal-communication.server.ts` loads the two payment tables alongside the existing sources.
- `src/lib/meal-notify.server.ts`, `src/lib/meal-texts.functions.ts`, and `src/lib/committee-meal-texts.server.ts` consume the same ledger; no screen recomputes counts locally.
- UI updates in `src/components/meal-notify-tracker.tsx`, `src/routes/_authenticated/admin/meal-texts.tsx`, and `src/routes/_authenticated/admin/meal-texts-mine.tsx`.
- No migration, no deletions.
