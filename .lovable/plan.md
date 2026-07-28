## What's happening

Mysha Woods can't add any guest — every attempt shows "Couldn't add that guest / Something went wrong."

Confirmed root cause (verified in the database, not a guess):

- The Add guest / paste / spreadsheet flows on the committee upload screen insert directly into `invitations` from the browser.
- The insert rule on `invitations` only allows a row when `host_id` equals the signed-in user's own ID (or the user is an admin).
- The screen sets `host_id` from the selected committee roster row, not from the signed-in user. Mysha's roster row is owned by Kari's account (`host_id` = Kari), while Mysha signs in as her own account.
- Result: the row is rejected every single time. Same failure applies to any committee member whose roster row is owned by someone else — this is not specific to Mysha or to that one brother.

Mysha does have the correct `team` + `host` roles, so roles are not the problem.

## The fix

1. **Add a server-side "add guest" path** (authenticated server function) used by the committee/admin upload screen for single add, pasted list, and spreadsheet import:
   - Verifies the caller is admin or committee/team.
   - Sets `host_id` to the caller's own account (admins keep the ability to add on behalf of another roster owner).
   - Keeps `inviter_id` set to the selected committee member, so the guest still shows under the right person's list and counts.
   - Preserves existing duplicate detection and the friendly "already on the guest list" message; real errors return the actual reason instead of a generic "Something went wrong."
2. **Repair the roster ownership data** so committee members own their own roster rows: backfill `inviters.host_id` to each committee member's own account where one exists (Mysha's row currently points at Kari), without changing which guests belong to whom.
3. **Forward-fix** so newly created committee roster rows are linked to that person's account automatically instead of the admin who created them.
4. **Better error surface**: on failure, show the real cause (permission, duplicate, missing phone) rather than a generic toast.

## Verification before I call it fixed

- Sign in as Mysha's account in the preview, add "James Mantos / 808-393-0550", confirm the row is written and appears on her list and in her counts.
- Repeat with the paste and spreadsheet paths.
- Re-check that another committee member (e.g. Tina) can still add, and that guest totals/seat counts update.
- Read the rows back from the database to confirm `inviter_id` and `host_id` are correct.

## Technical notes

- New authenticated server function in `src/lib/` (e.g. `guest-add.functions.ts`) with `requireSupabaseAuth`; role check via `private.has_role` through the user's own client.
- `src/routes/_authenticated/admin/upload.tsx` switches its three `supabase.from("invitations").insert(...)` call sites to the server function.
- One migration for the `inviters.host_id` backfill + trigger/default for new roster rows. No RLS loosening — the insert rule stays as-is.
