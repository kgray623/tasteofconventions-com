# Make the meal texts screen say exactly one honest thing

2026-08-10 03:2x UTC

The screen in the screenshot still speaks the old two-campaign language ("No Zelle update yet for African", "Show only people who haven't had the new payment update") while the reconciled ledger already has one queue: everyone who ordered a meal needs the payment update text unless a payment is recorded. Two vocabularies on one screen is what makes the marks look arbitrary.

## What changes on Admin → Meal texts (and Meal texts · mine)

1. **One list, one label.** Drop the separate "Zelle update" campaign vocabulary from the guest rows. Each guest shows exactly one of:
   - "Payment update sent <date> · African"
   - "Payment update not sent yet · African"
   - "Paid — restaurant confirmed" or "Paid — reported, awaiting confirmation"
2. **Paid guests leave the texting list.** Anyone with a recorded payment (restaurant-confirmed or reported) is filtered out of the queue and shown in a small collapsed "Already paid — no text needed" line per cuisine, so nothing disappears.
3. **The toggle is renamed** to "Show only people who still need the payment text", and the header count matches the ledger's `needs_update` number for the current filter — the same number the Overview tracker shows.
4. **Undo wording** becomes "Payment update sent · Undo".
5. **Nothing about sending changes.** The message body, the Text button, Copy, and the rule that only "Check here after you text" sets a mark all stay exactly as they are. No send history, payment, or confirmation row is deleted or rewritten.

## Where the marks come from

The sent mark for the payment update continues to read and write `meal_zelle_text_sends` (the existing rows for the new payment update). The older `meal_text_sends` history stays in the database and stays visible as a secondary "earlier message sent <date>" note on the row — reference only, never gating the queue.

## Verification before this is called done

- Read the ledger from the database and confirm, on the exact route at phone width: total meal orders = still needs the payment text + payment update sent + paid (confirmed) + paid (reported) + exceptions, and the on-screen header count equals the ledger's needs-update count.
- Confirm the four restaurant-confirmed guests and Melissa Novotny (reported) appear under "Already paid — no text needed" and not in the texting queue.
- Confirm a guest with no mark reads "Payment update not sent yet", and that checking the box flips it to "Payment update sent" with a database read-back — and undo removes only that one mark.
- Confirm the same on Meal texts · mine for a committee member with their own guests.

## Technical details

- `src/routes/_authenticated/admin/meal-texts.tsx` and `meal-texts-mine.tsx`: remove the `isZelle` label branching in the row badges/buttons and the campaign-specific toggle copy; source per-row state from the canonical ledger states in `src/lib/meal-communication.ts` (`paid_confirmed`, `paid_reported`, `needs_update`, `update_sent`, `exception`) instead of inferring from `sent_at`/`zelle_sent_at` alone.
- `src/lib/meal-texts.functions.ts` / `committee-meal-texts.server.ts`: include the payment state (source + paid_at) per preorder+cuisine in the rows the screens already load, so the UI does not need a second fetch.
- Presentation and row-filtering only; the write paths (`setSent`, template save, payment recording) are untouched.
