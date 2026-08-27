# Remove Juliet and the duplicate Belgium-number entry from Unpaid guests

Verified 2026-08-27 17:29 UTC.

## Current verified facts

- **Juliet Sossou-Etse**, phone **(402) 810-4177**, is the active household record with **Indonesian ×2** and a payment recorded for all 2 plates.
- The duplicate **Dodzi Sossou (With Juliette and Sasha)** record with Belgium number **+32 486 589 852** is no longer active. Both its invitation and its emptied preorder exist only in the protected deletion archive.
- The Belgium-number record must remain preserved in Admin → Recently deleted, but must not appear on any active unpaid, texting, guest, or restaurant list.
- Juliet’s restaurant confirmation is still false. She may correctly remain under **Reported paid — awaiting restaurant confirmation** and on Koen’s confirmation list, but she must not appear on `/admin/unpaid`.
- The database and canonical ledger classify Juliet’s fully paid committee-reported order as paid. The precise live request/cache boundary causing the stale unpaid entry remains to be confirmed.

## Execution plan

1. Capture the authenticated `/admin/unpaid` server-function result and rendered page at 390×844, checking both **Juliet / (402) 810-4177** and **Dodzi / +32 486 589 852**.
2. Trace `getMyMealTexts` → canonical meal ledger → `useMyUnpaidMeals`, including cache invalidation after a payment is recorded and filtering of archived/deleted invitations.
3. Correct only the stale-list boundary so:
   - fully reported-paid cuisine lines disappear immediately from `/admin/unpaid`;
   - archived invitations/preorders can never enter active unpaid results;
   - restaurant verification remains separate and unchanged.
4. Add regression coverage for:
   - Indonesian ×2 with `qty_paid = 2`, `source = committee_recorded`, `confirmed = false` being absent from unpaid;
   - a preorder whose invitation was archived/deleted being absent from all active ledgers even if an old cached response existed.
5. Verify end to end as Kari/admin at 390×844:
   - `/admin/unpaid` contains neither Juliet nor the Belgium-number duplicate.
   - Unpaid guest/plate totals match fresh database read-back.
   - `/admin/meal-texts` retains Juliet only under **Reported paid — awaiting restaurant confirmation**, with no Dodzi/Belgium entry.
   - Koen’s active list contains Juliet for verification and no Dodzi/Belgium entry.
   - Admin → Recently deleted still retains the Dodzi/Belgium invitation and preorder.
6. Report exact route results and a UTC timestamp. Do not call it corrected unless database, server responses, and rendered pages agree.

## Scope

No payment, RSVP, meal quantity, referral, or restaurant-confirmation data will be altered. The archived Belgium-number submission remains retained for audit/history and is removed only from active displays.
