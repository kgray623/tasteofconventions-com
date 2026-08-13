# Replace the misleading meal-text list with the complete verified-unsent list

**Database and code review: 2026-08-13 04:59 UTC**

## Verified problem

- Rick & Maddie Madrid have an active in-person preorder at **562-326-4395** for **Indonesian ×1 and Myanmar ×1**.
- Their database history contains two old `legacy_live_mark` rows, but there is **no human evidence review confirming either physical text was sent**.
- The visible controls labeled “Confirm Indonesian text sent” and “Confirm Myanmar text sent” are actions the user can tap after sending; they are not checked states. The leading check icons make them look like proof that the texts were already sent.
- The server currently reconstructs 54 “physically texted” contacts from chronological legacy marks and removes those contacts from the queue. Those timestamps do not prove which messages exist on Kari’s phone.
- The latest retained evidence-review state currently proves **zero confirmed contacts**; the only reviewed cuisine line is disputed.

## Changes

1. Remove the reconstructed 54-contact exclusion from the authoritative needs-text queue. No legacy timestamp, inferred batch position, payment, page view, copy action, or SMS-composer launch may remove a person.
2. Build the complete list from every currently active preorder cuisine line. Exclude a cuisine only when its latest retained human review explicitly confirms that exact physical text was sent.
3. Keep Rick & Maddie Madrid visible once as a contact with both **Indonesian ×1** and **Myanmar ×1**, each with its own Text action, until each message is explicitly confirmed after Kari sends it.
4. Replace misleading check-styled action buttons with unmistakable neutral actions such as **“Mark Indonesian sent”** and **“Mark Myanmar sent.”** Do not show a checkmark until confirmation has actually been saved and read back.
5. After a successful confirmation, read the appended event/review back from the database, then remove only that confirmed cuisine line. If another cuisine remains unconfirmed, keep the contact visible with the remaining cuisine.
6. Remove the unproven “54 physically texted” and subtraction-based “remaining” claims from the top of the screen. Show only counts derived from active preorder lines and explicit human confirmations.
7. Make both meal-instruction CSV controls export exactly the same complete visible unsent list.
8. Preserve every preorder, RSVP, payment, legacy mark, dispute, and historical text record. This changes interpretation and presentation only; it does not delete or overwrite submitted information.

## Technical details

- Make `buildMealInstructionQueue` depend only on active ledger rows plus latest explicit cuisine-level evidence; remove `reconstructedSentContactIds` from its filtering contract.
- Keep the server-function module thin and perform queue calculation in the imported queue helper.
- Treat the latest append-only review as authoritative so a later dispute restores a cuisine to the unsent list without deleting prior history.
- Add regression coverage proving legacy marks never hide a contact, multi-cuisine contacts remain until every cuisine is confirmed, and a checkmark/status is rendered only after verified read-back.

## Verification before any completion claim

1. Read the backend immediately before testing and reconcile active contacts, cuisine lines, explicit confirmations, disputes, cancellations, declines, and Zoom exclusions.
2. Sign in as Kari/admin and test `/admin/meal-texts` at **384×681**.
3. Search for Rick & Maddie Madrid and verify their name, phone, Indonesian ×1, and Myanmar ×1 are visible with no checked/confirmed appearance.
4. Open both Text actions and verify the exact recipient and cuisine-specific message in the phone SMS composer; confirm that merely opening Messages changes no database row.
5. Explicitly mark one controlled cuisine sent, read back the new append-only event and review, reload, and verify only that cuisine leaves the unsent list while the other remains.
6. Verify the visible counts and both CSV exports match the database-derived unsent contacts and cuisine lines exactly.
7. Read the backend again and prove that no preorder, RSVP, payment, guest, legacy mark, or historical review was deleted or overwritten.
