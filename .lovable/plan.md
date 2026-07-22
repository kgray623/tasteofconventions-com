2026-07-22 20:46 UTC

Plan to fix Aisha Moore visibility:

1. Verify the exact missing record
   - Search the database for Aisha Moore, Mysha/Myisha, Moore, deleted rows, and audit history.
   - Confirm whether she exists as an invitation, committee/inviter record, login profile, RSVP, or only in an uploaded/imported source.

2. Repair the data link without overwriting anything
   - If Aisha Moore is missing from `invitations`, add or restore her as a guest/committee invitation using the uploaded details already present in the system.
   - If she exists but is not marked correctly, set the invitation committee flag and make sure her committee/inviter record is linked.
   - If she has an RSVP under a mismatched spelling or disconnected row, link it to the correct Aisha Moore invitation instead of deleting or replacing submitted information.

3. Backfill the forward-facing committee relationship
   - Ensure Aisha Moore appears anywhere committee members are listed.
   - Ensure her guests/RSVP status roll up correctly under the committee/committee guests views.

4. Verify end-to-end before calling it fixed
   - Read the database back to confirm Aisha Moore exists, is committee-visible, and has the expected RSVP link/status.
   - Check the actual admin mobile route where you expect to see her, using the admin role, and confirm her name appears in the UI.