I verified the live data and found the real mismatch: the dashboard is showing RSVP rows, while the number you counted is people/party size.

Current audited database totals:
- Invitations uploaded: 94 total = 86 guests + 8 committee
- RSVP responses: 36 total = 34 guests + 2 committee
- Guest yes responses: 24 RSVP records
- Guest yes people: 37 people, because those 24 yes RSVPs include party sizes
- Committee yes responses: 2 RSVP records = 3 people
- No responses: 10
- Pending invitations: 58 total = 52 guests + 6 committee
- Food preorder rows: 18 total, but 3 are older/unlinked rows not attached to any invitation; linked invitation food orders are 15 rows / 27 meals

Plan to make this exact and auditable:

1. Replace the admin overview’s browser-side counting with one server-side audit function
   - Count from `invitations` as the source of truth.
   - Join each invitation to its one RSVP and one cuisine preorder.
   - Return plain totals for guests, committee, and all invitees.
   - Include both RSVP response counts and actual people counts from `party_size` so 24 yes responses and 37 yes people are not confused.

2. Update the admin overview cards to show the exact accountable numbers
   - Keep the RSVP wording.
   - Show uploaded, sent, yes RSVPs, yes people, no RSVPs, pending, waitlist, and food orders/meals.
   - Add an all-invitees total card so 94 is visible without adding guests + committee manually.

3. Add an audit/reconciliation section on the admin overview
   - Show whether every invitation is accounted for.
   - Show duplicate RSVP count, orphan RSVP count, and unlinked preorder count.
   - Surface the 3 unlinked food preorder entries so they cannot silently affect totals or disappear.

4. Update the preorder report to separate linked and unlinked orders
   - Linked orders count toward event totals.
   - Unlinked orders appear in a review section with name/phone/selections.
   - This prevents old/manual rows from being mixed into official invitation totals.

5. Add a downloadable reconciliation CSV
   - One row per invitation.
   - Columns: guest name, phone, committee/guest, sent status, RSVP status, party size, attendance mode, food ordering flag, preorder selections, preorder meal count.
   - This gives you a file to verify every person/invitation instead of trusting cards alone.

Files to change:
- `src/lib/admin-audit.functions.ts` or equivalent new server function module
- `src/routes/_authenticated/admin/index.tsx`
- `src/routes/_authenticated/admin/preorders.tsx`

No guest data will be deleted. No RSVP or preorder records will be changed by this plan; it only fixes counting, reporting, and visibility.