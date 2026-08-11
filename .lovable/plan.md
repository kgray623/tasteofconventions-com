# Lock payment records so nothing can change them

2026-08-11 16:53 UTC

## What is true today

- Every insert, update, and delete on the payment records is already written to the permanent activity ledger (audit trigger in place), and a source guard checks that each record says where it came from.
- What is missing: nothing stops a payment record from being **deleted** or quietly rewritten. There is no protected-delete guard on payments the way there is on guest records, and no rule that a restaurant-confirmed payment can never be downgraded.

## What this change does

1. **Restaurant-confirmed payments are frozen.**
   Once a restaurant confirms a payment, that record cannot be edited, downgraded to unpaid, re-sourced, or deleted by any screen, script, or bulk action. The only allowed change is the restaurant adding more detail (never removing).

2. **Guest-reported payments are locked too.**
   When someone says "I already paid", that record stands. It cannot be deleted or reversed by staff, committee, or any automated path. A restaurant can only *upgrade* it to confirmed. It stays visible as "Awaiting restaurant confirmation" until then.

3. **The one and only way a payment record goes away**
   The guest cancels the matching meal in their own RSVP, with the confirmation prompt that is already in place. In that case the payment record is not erased either — it is marked as belonging to a cancelled meal and kept on record, so the money history is never lost.

4. **Database-level backstop.**
   The freeze is enforced in the database, not just in the app, so no future screen, migration helper, or admin tool can bypass it. Any blocked attempt returns a clear message and is recorded.

## Verification before I call it done

- Attempt, directly against the database, to delete and to downgrade one restaurant-confirmed payment and one guest-reported payment — both must be refused.
- Confirm all existing payment rows are unchanged after the guard is in place (count and per-row read-back), including the five restaurant-confirmed ones you approved.
- On the real screens at 384x681: guest RSVP payment section, committee meal-payments panel, and a restaurant portal — confirm confirmed rows are read-only, guest-reported rows still show "Awaiting restaurant confirmation", and a restaurant can still confirm.
- Cancel one meal from a guest RSVP and read back that the payment record is retained and clearly marked, not deleted.

## Technical notes

- Add a `BEFORE UPDATE OR DELETE` guard trigger on `public.meal_payments`: block all deletes outright; on update, reject any change that clears `paid_at`, lowers `qty_paid`, changes `source` away from `restaurant`, or clears `verified_at`.
- Add a `cancelled_meal_at` marker column so a guest-cancelled meal flags its payment row instead of removing it.
- Keep the existing audit and source-guard triggers untouched; the new guard runs alongside them.
- No changes to how payments are recorded or read; only removal/downgrade paths are closed.
