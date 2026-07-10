Root cause I found: the button now navigates, but the upload flow still depends on committee/team role resolution and the invitations insert policy only allows `host_id = current user`. If role resolution stalls or the user is not granted `team` before landing there, the page can hang/block; if they get to the page, guest creation can still fail under the current insert rules.

Plan:
1. Keep the orange top **Upload guests** button as a direct link, but make it preserve committee mode consistently:
   - `/admin/upload?view=committee` for committee/admin-preview contexts.
2. Make `/admin/upload` fail-safe for committee members:
   - wait for auth and role loading before rendering access decisions,
   - call the committee role refresh once on page entry,
   - show the upload tools only after the role check is resolved.
3. Fix guest creation permissions so committee/team members can actually add guests:
   - add a database migration updating the `invitations` insert policy to allow authenticated `team` and `admin` users to insert guest records, while still requiring their own `host_id` unless they are admin.
   - keep existing guest data and existing architecture intact.
4. Verify end-to-end on the mobile viewport:
   - `/admin` as a committee-capable signed-in user shows the orange top **Upload guests** button,
   - tapping it reaches `/admin/upload?view=committee`,
   - the upload page renders the guest upload controls instead of hanging or showing access denied,
   - adding a test guest writes an invitation row and reads it back, then remove only that test row if created for verification.