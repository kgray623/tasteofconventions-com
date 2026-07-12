## Problem

On `/admin/team`, the "Pending invites" list shows people it shouldn't:

- **Rhonda Wiltshire** — already flagged as committee on her invitation, but has a stale `team_invites` row (from when she was first added), so she still shows as "awaiting signup".
- **Jen Spears** — was removed from the committee, but the `team_invites` row was never deleted.
- **Yeshia Meyer** — just added via the guest picker. She has an invitation record, but the "Add" flow only creates a `team_invites` row; it never sets `is_committee=true` on her invitation, so she looks pending even though she's a picked-from-the-guest-list committee member.

Root cause: the app tracks committee membership in two places (`invitations.is_committee` and `team_invites`) and nothing keeps them in sync.

## Fix

Keep the two sources in sync and make "Pending invites" reflect actual pending state — no schema changes.

### 1. Add committee via guest picker → auto-flag the invitation

In `inviteTeamMember` (`src/lib/team.functions.ts`), when `role === "team"`, also set `is_committee=true` on the matching invitation(s) by phone (last-10-digit match). This mirrors what admins do manually on the guests page and makes Yeshia-style picks disappear from "pending" the moment they're added.

### 2. Remove committee tag → clean up team_invites

In `toggleCommittee` (`src/routes/_authenticated/admin/upload.tsx`), when `checked === false`, also delete any `team_invites` rows whose `phone_normalized` matches that guest's phone (via a new small server function `removeTeamInvitesForPhone` that verifies admin + deletes). This fixes Jen — unchecking committee cleans up the stale invite.

### 3. "Pending" filter treats `is_committee` guests as accepted

In `src/routes/_authenticated/admin/team.tsx`, extend the `pending` filter to also exclude any invite whose phone tail matches a guest with `is_committee=true`. This fixes Rhonda immediately (no data migration needed) and is a belt-and-suspenders guard if the two sources ever drift again.

### 4. One-time cleanup of existing stale rows

Delete `team_invites` rows for phones that either (a) already match an `is_committee=true` invitation, or (b) match a guest with no committee flag AND were previously toggled off. Since we can't reconstruct history for (b), we only auto-clean case (a); Jen's row is removed manually via the existing "Remove" button on the pending list (or covered by fix #2 the next time an admin toggles).

## Technical details

- `src/lib/team.functions.ts`:
  - `inviteTeamMember` handler: after upserting `team_invites`, when `role === "team"`, run `update invitations set is_committee=true where right(guest_phone_normalized,10) = right(phoneNorm,10)`.
  - New `removeTeamInvitesForPhone` server fn: admin-only, `delete from team_invites where right(phone_normalized,10) = right(:digits,10)`.
- `src/routes/_authenticated/admin/upload.tsx`: `toggleCommittee` calls the new server fn when unchecking, and refreshes local state.
- `src/routes/_authenticated/admin/team.tsx`: `pending` filter also skips invites whose last-10 digits are in `existingCommitteeTails` derived from `guests.filter(isCommittee)`.

## Out of scope

- No schema/RLS changes.
- No changes to sign-in, roles, or the inviter quota.
- The `inviters` sync in `syncCommitteeInviter` is unchanged.
