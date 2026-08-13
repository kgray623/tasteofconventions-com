# Exact meal-order contacts still needing the restaurant-payment text

**Database review: 2026-08-13 04:14 UTC**

## What the numbers mean

- **69** is the total number of currently eligible meal-order contacts. It is not the number left to text.
- Those 69 contacts account for **106 cuisine order lines and 134 plates**: African 36, Indonesian 55, Myanmar 43.
- The retained payment-text history contains marks for more contacts than Kari’s reported **54 physical texts**, so it cannot truthfully identify the remaining people without reconciling that discrepancy first.
- Shelley & Pat Monaghan and Teresa Drake are committee contacts, not current meal-order contacts under their own names. They will not be inserted into this list unless they personally preorder. Their guests with active orders remain included under each guest’s own name.

## Changes

1. Make `/admin/meal-texts` answer one question first: **“Which meal-order contacts have I not sent restaurant-payment instructions?”**
2. Keep the scope strictly to people who personally have an active meal preorder, including committee members only when they personally ordered.
3. Reconstruct the exact 54-contact morning batch from retained order and text-history timestamps; compare it line by line with the current 69-contact ledger.
4. Do not treat existing automatic/legacy marks as proof. Present any mismatch between the reconstructed batch and Kari’s count of 54 as a short reconciliation list requiring explicit confirmation.
5. After reconciling the 54, show the exact remainder once per person, with name, phone, cuisine(s), quantity, restaurant-payment SMS action, and assigned committee member for context.
6. Use plain labels everywhere: **69 total meal-order contacts**, **54 physically texted**, and **15 remaining** only if the row-level reconciliation proves those counts. If changes, cancellations, payments, or duplicate contacts alter the subtraction, display the proven result instead of forcing 15.
7. Keep paid contacts in scope when they still need restaurant instructions; payment alone never proves the instructions were sent.
8. Preserve every preorder, RSVP, payment, sent mark, and historical record. Opening Messages, copying, exporting, or viewing the page records nothing.

## Technical details

- Use the canonical active meal ledger for eligibility and quantities.
- Key send evidence by preorder plus cuisine, while grouping the screen once per contact.
- Store only an explicit human confirmation as physical-send evidence; do not infer it from a tap or legacy timestamp.
- Separate historical marks from confirmed physical sends so the app never silently converts uncertain data into “sent.”
- Make the CSV export match the visible remaining-contact list exactly.

## Verification

1. Read back all active orders and reconcile the page to the database totals for contacts, cuisine lines, and plates.
2. Prove the exact identities in the 54-contact sent batch and the exact identities in the remaining list; do not report a remainder from subtraction alone.
3. Verify all active ordering guests assigned to Shelley & Pat and to Teresa appear under the guests’ names; verify Shelley/Pat and Teresa themselves are absent unless a personal active preorder exists.
4. As Kari/admin on `/admin/meal-texts` at **384×681**, verify the remaining list, every SMS recipient/body, explicit sent confirmation, reload persistence, and CSV.
5. Read the database again and prove that viewing, copying, exporting, and opening Messages changed no order, RSVP, payment, or text-history record.
