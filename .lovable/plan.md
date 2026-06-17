I’ll fix this globally for every current and future committee member.

Plan:
1. **Use one committee dashboard for all committee members**
   - Keep `/admin` as the committee workspace for every non-admin committee member.
   - Admin preview mode will use the same component, so admin and committee views stay consistent.

2. **Make the “My Guests Uploaded” count update correctly**
   - Refresh the committee guest data automatically every 30 seconds.
   - Also refresh immediately when invitations or RSVPs are added, edited, or deleted.
   - This will make deleted guests disappear from Dixie's count and list without needing a manual reload.

3. **Keep stats current every 30 seconds**
   - Update the RSVP totals card polling so “My guests uploaded,” “My in-person RSVPs,” and “My RSVPs left” refresh at least every 30 seconds for every committee member.
   - Preserve the existing realtime updates, but do not rely on realtime alone.

4. **Make the guest list always use the three requested category boxes**
   - First box: RSVP’d guests, alphabetical.
   - Second box: Awaiting RSVP / waiting guests, alphabetical.
   - Third box: Declined guests, alphabetical.
   - This will apply to every committee member’s personal guest list, not only Dixie.

5. **Fix the “random” full guest list ordering**
   - Sort the broader guest list consistently instead of using database-created order.
   - Use RSVP status groups and alphabetical names so it matches the organized committee behavior.

6. **Verify in the running app**
   - Confirm `/admin` shows the committee dashboard with the three guest category boxes.
   - Confirm totals and guest list refresh after deletion or RSVP changes.

Technical notes:
- Main files to update: `src/components/committee-workspace.tsx` and `src/components/rsvp-totals-card.tsx`.
- No database schema change is needed.