# Current event meal-prepay contact list

## Goal
Replace the limited personal/unpaid reconciliation with one authoritative, event-wide list of everyone who currently has an active meal preorder, compared directly with documented payment-update text activity.

## Verified baseline — 2026-08-13 00:20 UTC
- **69 active meal contacts**
- **106 active cuisine orders**
- **134 active plates**
- **62 contacts still have unpaid meals** covering **94 unpaid cuisine orders / 121 unpaid plates**
- The database currently records a payment-update text mark today for **55 active contacts / 83 cuisine orders**; Kari reports **54 physical texts**, so the one-contact discrepancy must remain visible for review rather than being treated as sent.
- Based on current active orders, payments, and documented marks, **9 unpaid contacts have at least one cuisine order still needing a payment-update text**: Adrianna Marie Gonzalez, Aletta Blair, Angela Waters, Cindy Garo, Liza Efigenio, Lori McLaren, Rick & Maddie Madrid, Stephanie Williams, and Whitney Hopkins.

## Build
1. **Create one current event roster**
   - Source every active preorder for the entire event, including guests and committee members.
   - Exclude cancelled meal quantities, declined RSVPs, Zoom attendance, and zero-quantity selections from current totals without deleting their history.
   - Show each contact once with phone number, every cuisine and quantity, total plates, payment state, and text state.

2. **Compare against documented physical texts**
   - Match each active cuisine order to the append-only payment-update text history.
   - Distinguish `Documented sent`, `Mark needs verification`, `Paid — no prepay text needed`, and `Needs prepay text`.
   - Keep the reported **54 physical texts** separate from the database’s **55 marked contacts** until the extra mark is explicitly confirmed or disputed.

3. **Show the actionable remaining list**
   - Add a default **Needs prepay text** view listing every unpaid contact with one or more untexted cuisine orders.
   - Preserve partially paid/partially texted contacts and show exactly which cuisines still require the update.
   - Include the current 9-contact result above and update it live whenever an order, cancellation, payment, or explicit send confirmation changes.

4. **Add clear event-wide filters and export**
   - Filters: All current orders, Needs text, Documented sent, Paid, and Cancelled/history.
   - Display contact, cuisine-order, and plate totals separately so they cannot be confused.
   - Export the currently filtered list to CSV with names, phone numbers, cuisine quantities, payment status, and documented text status.

5. **Preserve accurate human tracking**
   - Opening Messages or copying a message records nothing.
   - Record a physical send only after the staff member explicitly confirms it was sent.
   - Keep all previous marks, reversals, payments, and cancellations append-only and visible to authorized staff.

## Technical details
- Use the existing canonical meal ledger as the single source for active quantities and payment state, extended to include RSVP/attendance eligibility and cancellation history consistently.
- Derive current text state from the latest append-only `payment_update` event and evidence review per preorder+cuisine key.
- Remove hard-coded assumptions that the reconciliation always contains 62 unpaid contacts or exactly 54 confirmed records.
- Keep the authenticated admin/team authorization and existing server-function boundaries.

## Verification
- Database read-back must reconcile the rendered roster to **69 contacts / 106 cuisine orders / 134 plates** at the verified baseline.
- Verify all nine currently outstanding contacts and their cuisine-specific needs against database rows.
- Test marking one text sent and reversing it; confirm the database history, remaining list, counts, and CSV all update correctly without losing any submitted data.
- Test `/admin/meal-texts` end-to-end as an authorized admin at the exact **384×681** mobile viewport, including filters, SMS handoff, explicit confirmation, reload persistence, and export.
