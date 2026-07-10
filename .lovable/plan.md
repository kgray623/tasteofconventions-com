I checked the current records: every current food preorder is linked to an invitation and has an RSVP status of `yes`. The problem is the previous cleanup deleted archived preorder rows for Jana Weinberger and Yetunde Adejunmobi instead of restoring/merging them as RSVP-backed food orders. We need to restore their submitted information without overwriting anything.

Plan:

1. Restore the archived food order information
   - Bring back the two archived preorder submissions for Jana Weinberger and Yetunde Adejunmobi from the deleted-row archive.
   - Because each already has a current linked preorder for the same invitation, preserve the existing linked row and merge the archived selection into it instead of losing either submission.
   - Keep all submitted food choices visible/countable; do not drop or hide any submitted meal request.

2. Make the database treat matched meal orders as RSVP-backed orders
   - Keep/link `cuisine_preorders.invitation_id` by matching the submitted phone to the invitation phone.
   - If the matching invitation already has an RSVP, the preorder must be treated as linked and counted.
   - If a matching invitation does not have an RSVP, create or repair the missing RSVP relationship according to the existing RSVP table rules so the food order cannot appear as “not an RSVP.”

3. Remove the misleading “unlinked/not counted” behavior for valid guests
   - Update the admin preorder report so known guests with matched invitations/RSVPs are included in restaurant totals.
   - Replace the “unlinked food orders” language with a true exception-only state for unknown phone numbers that cannot be matched to any invitation.

4. Forward-fix the submission flow
   - Update the public preorder submission path so a phone number must resolve to an invitation/RSVP before saving food choices.
   - If a guest already has a linked preorder, merge/update their choices instead of creating a duplicate or deleting the older submission.
   - If the phone cannot be matched, block submission with a clear message instead of creating an unlinked row.

5. Verify end-to-end before calling it resolved
   - Read back the database chain for Jana and Yetunde: phone → invitation → RSVP → preorder selections.
   - Confirm the admin preorder report counts their restored selections in the restaurant totals.
   - Confirm there are no remaining preorder rows for known guests that are unlinked from invitations/RSVPs.