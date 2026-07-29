## Plan: repair “Brought by” referral accounting

**Verified current state**
- The admin guest list is currently reading `invitations.inviter_id` for “Brought by.”
- The RSVP form stores the typed/referral-picked answer in `rsvps.invited_by`.
- The database has a trigger meant to copy `rsvps.invited_by` to `invitations.inviter_id`, but it only handles exact committee roster names.
- Current data shows mismatches: 80 RSVPs have an `invited_by` value, 19 of the ones with exact committee matches are linked to a different “Brought by” person, and 3 confirmed rows currently have no `inviter_id`.
- Examples from the screenshots are real data mismatches: Deshon Bradley, Cynthia Futo, Leticia Tchato, Mike and Tracey Curtis, Sara Reikofski, Lenora Clark, Cheri Kimball, and others have an RSVP `invited_by` that does not match the displayed “Brought by.”

## What I will change

1. **Database forward-fix**
   - Replace the existing RSVP referral trigger with a safer resolver that uses the actual `rsvps.invited_by` value.
   - Resolve common name variations already present in the data, including:
     - `Myisha Woods` → `Mysha Woods`
     - `Jamie Elker` → `Jamy Elker`
     - name-prefix/suffix matching for names like `Shelley Monaghan` matching the existing `Shelley & Pat Monaghan` roster row when unambiguous.
   - If a guest invited another guest, resolve through that guest’s existing committee chain so the new guest still appears under the correct committee-side list.
   - If the typed name cannot be resolved safely, clear the stale/wrong `inviter_id` instead of leaving an old wrong “Brought by.”

2. **Database backfill**
   - Recalculate existing `invitations.inviter_id` from current `rsvps.invited_by` values.
   - This will correct the existing wrong “Brought by” labels where the referral can be resolved safely.
   - It will not delete guest records, RSVP records, meal orders, or submitted data.

3. **Code display fix**
   - Update admin guest search/results so “Added/Brought by” uses `inviter_id` first, not only `host_id`, because admins can upload guests on behalf of committee members.
   - Keep existing committee workspace ownership rules: a guest belongs to a committee member when either the host account or the referral/roster id points to them.

4. **Verification**
   - Re-query the database for the screenshot names and confirm the displayed “Brought by” matches the RSVP referral where resolvable.
   - Re-check counts for rows with missing `inviter_id`, exact referral mismatches, and unresolved referral names.
   - Verify the admin guest list route loads and shows the corrected labels.

## Important limits

- I will not guess unknown relationships. Rows with an unresolved `invited_by` name will be flagged/left unattributed rather than silently assigned to the wrong person.
- I will not delete, hide, or overwrite any submitted guests, RSVPs, phone numbers, or meal orders.
- Some relationships may still require your decision if the referral text points to a person who is not in the committee/guest chain or has multiple possible matches.