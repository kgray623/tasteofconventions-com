# Correct committee membership and meal-message accounting

## Verified findings

- The new Zelle/payment update ledger currently contains **0 sent marks**. Nobody is recorded as receiving the new update.
- The displayed **21 pending for Kari Gray** comes from the older meal-text ledger: 31 restaurant-order messages minus 10 older marks. It is not the new update-message count.
- The committee-message screen currently combines active inviters, team invitations, and guest records flagged as committee. This causes unverified names to appear and allows one person to appear more than once when the records use different names or missing phone numbers.
- Tirzah Corbin is not flagged as committee on her guest invitation and has no active team role, but she still has a pending team invitation and an active inviter record. Those two records are why she appears on the committee-message screen.
- The invitation table has no exact duplicate name-and-phone rows. The visible duplicates come from representing the same person in multiple committee-related tables, including name variations such as Myisha/Mysha and Melissa Novotny/Novotne.

## Changes

1. **Make the new update campaign start honestly at zero**
   - Keep the original meal-message history separate and unchanged.
   - Label the two campaigns unmistakably as **Original meal message** and **New payment update**.
   - Make the dashboard tracker, totals, filters, badges, and per-person list use the selected campaign’s ledger from one shared calculation.
   - Show the new payment-update campaign as 0 sent and every eligible previously contacted meal order as pending until a person explicitly checks it after sending.

2. **Use actual access roles as the committee source of truth**
   - Build the committee-message roster from actual `admin`/`team` user roles and their linked identity records, rather than unioning every inviter, pending team invitation, and committee-flagged guest.
   - Exclude pending/unaccepted and roster-only names from the active committee list.
   - Resolve each real person by user identity first, then normalized phone, so one person renders once even when names differ across records.
   - Keep the admin role represented correctly without showing technical AI-access accounts in the human committee texting roster.

3. **Remove Tirzah from committee access sources without deleting her guest information**
   - Revoke Tirzah Corbin’s pending team invitation.
   - Remove/deactivate her committee-only inviter entry if it owns no submitted guests; if it owns records, retain those records and reclassify only the committee status so nothing submitted is lost.
   - Preserve Tirzah’s guest invitation, RSVP status, phone, and any other submitted information as ordinary guest data.

4. **Clean up visible duplicates safely**
   - Collapse duplicate committee representations into one canonical roster entry; do not delete guest, RSVP, meal, referral, or activity records.
   - Correct safe spelling variants only where phone/user identity proves they are the same person.
   - Add a prevention guard so future pending invites or duplicate source records cannot silently become active committee roster entries.

5. **Make every displayed accounting number traceable**
   - Centralize campaign totals so the overview card and detail screen cannot calculate different values.
   - Add a visible generated/read-back timestamp and plain labels for sent, pending, restaurant-order messages, and meal quantities.
   - Preserve the rule that tapping Text, copying a message, or opening a page never marks anything sent; only the explicit post-send checkbox writes a mark.

## Validation

- Read back the database after cleanup and confirm: new payment updates sent = 0; Tirzah has no team/admin access or active committee roster entry; her guest information remains present.
- Compare every overview total with the exact rows on the corresponding detail list, including Kari Gray’s original-message list and new-update list.
- Test the admin routes on the user’s 384 × 681 mobile viewport: committee message roster, admin meal texts, and overview tracker.
- Test as admin and committee roles, checking list membership, campaign switching, one explicit sent mark, its immediate count change, database read-back, and Undo restoring the count.
- Confirm duplicate names no longer render while all associated guest, RSVP, meal, referral, and audit records remain retained.

## Technical details

- Keep original sends in `meal_text_sends` and new payment updates in `meal_zelle_text_sends`.
- Replace the client-side three-table roster union with one authenticated server-side canonical roster resolver.
- Apply data cleanup through approved backend data operations; use a migration only if a database guard/index is required to prevent recurrence.
- Add focused calculation and identity-resolution tests before end-to-end mobile verification.