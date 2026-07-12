## Goal

On the "Add committee" page, let admins pick any existing guest from the RSVP/invitation list via a searchable dropdown instead of retyping name + phone. Selecting a guest auto-fills their name and phone, and one click adds them as a committee member.

## Changes

1. **Add committee page (`src/routes/_authenticated/admin/team.tsx`)**
   - Add a searchable dropdown (Command/Combobox from shadcn) above the existing name/phone inputs, labeled "Pick from guest list".
   - Load all rows from `invitations` (guest_name, guest_phone, id) for the current event, sorted by name.
   - Typing filters by name or phone digits; selecting a guest fills the Name and Phone fields (which remain editable as a fallback).
   - Role dropdown (Committee / Admin) and the "Add" button stay as they are, wired to the existing `inviteTeamMember` server function — no backend changes needed.
   - Keep the manual name/phone inputs visible for the case where the person isn't yet on the guest list.

2. **Behavior**
   - Guests already marked committee (or already accepted a team invite matching that phone) are shown with a "Already committee" badge and disabled in the dropdown, so we don't create duplicates.
   - After a successful add, the form clears and the pending-invites list refreshes (already implemented).

## Out of scope

- No schema changes. No changes to `inviters`, `team_invites`, or RLS.
- The `is_committee` flag on `invitations` is not toggled here — this only creates/updates the `team_invites` + `inviters` rows via the existing server function, matching current behavior.
- The inline "Add committee member" link on `/admin/inviters` stays as-is.
