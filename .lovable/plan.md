Plan to fix the RSVP guest categories and committee member scope

1. Update the committee workspace guest groups
- Replace the current grouped labels:
  - “RSVP’d”
  - “Awaiting RSVP”
  - “Declined”
- With exactly these RSVP groups under the committee member’s guest list:
  - “RSVP in person”
  - “RSVP by Zoom”
  - “Decline”
  - “Pending”
- Remove “Maybe” and “Waitlist” as visible committee RSVP categories for this view.
- Treat null/no RSVP as “Pending”. If an old row has `waitlist` or `maybe`, group it with “Pending” for this committee view so it does not show as its own category.

2. Scope committee guest lists to the logged-in committee member
- The committee workspace will display categories from `myGuests`, not the global `guests` list.
- Pending will show only invitations owned by the logged-in committee member’s resolved host identity, not all 144 global pending invitations.
- Keep the existing admin-only views intact; admins can still see global lists in admin routes.

3. Preserve the current ownership resolution
- Use the existing `myHostIds` resolution logic, which matches the logged-in user to inviter records by user id, phone, and name.
- Do not guess a different relationship or overwrite any submitted guest/RSVP data.

4. Adjust RSVP labels and badges
- “RSVP’d yes” becomes mode-specific in this context:
  - in-person yes → “RSVP in person”
  - Zoom yes → “RSVP by Zoom”
- `no` becomes “Decline”.
- pending/null/old maybe/old waitlist becomes “Pending”.

5. Verification after implementation
- Read back the database counts by host to confirm global pending is 144 but each committee member’s pending count is smaller and personal.
- Open the committee route at the current mobile-sized viewport.
- Verify the rendered committee dashboard shows only the four requested RSVP categories.
- Verify “Pending” count/list comes from the logged-in committee member’s own guests, not all guests.
- Verify admin/global guest views are not changed unless they are explicitly part of the committee preview.