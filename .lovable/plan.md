## Goal
Require every RSVP to name a committee member as their inviter. Remove the "Other…" free-text escape hatch on both RSVP forms, and validate against the committee roster on the server.

## Changes

### 1. Guest RSVP forms — replace free-text with committee-only picker
Files: `src/routes/rsvp.index.tsx`, `src/routes/rsvp.$token.tsx`

- Replace the "Invited by" `<Input>` with a searchable committee-member picker (Command/Combobox) sourced from a new **authenticated** server fn `getCommitteeRosterPublic` (see #2). No "Other" option, no free typing that isn't a match.
- Store the selected committee member's id + display name in draft state. Clear any legacy `__other__` / free-text draft values on hydrate.
- Submit sends `invited_by` = selected committee name (and `invited_by_id` if useful).
- Field label copy: "Invited by (committee member) *" with helper text: "You must be invited by a committee member to RSVP."

### 2. Server: expose committee roster for the picker
File: `src/lib/invitations.functions.ts` (new export)

- Add `getCommitteeRoster` server fn (no auth required — RSVP is public) that returns `{ id, name }[]` of committee members only. Source: union of
  - `inviters` where active
  - `invitations` where `is_committee = true`
  - `team_invites` with role `team`
  Dedupe by lowercased name. Reuses logic already in `get_public_inviters()` DB function — call it via a SECURITY DEFINER RPC that returns names only (no PII). The existing `get_public_inviters()` was locked down for `inviters_public_pii`; we'll add a narrow replacement RPC `get_committee_names_for_rsvp()` returning only `{id, name}` and grant EXECUTE to `anon, authenticated`.

### 3. Server-side validation on RSVP submit
File: `src/lib/invitations.functions.ts` (`submitPublicRsvp`, and the token variant)

- After trimming `invited_by`, look up a case-insensitive match against the committee roster. If no match, throw a user-facing error: "Please select a committee member from the list."
- Reject `__other__` and empty strings explicitly.

### 4. Cleanup
- Remove the `__other__` sanitize effect from both RSVP routes (no longer needed once the input is a picker).
- Leave existing submitted rows untouched; only new submissions are gated.

## Out of scope
- Admin-entered invitations (admin can still assign any inviter).
- Backfilling old free-text `invited_by` values.

## Verification
- Load `/rsvp` and `/rsvp/$token` on mobile viewport: picker renders, search works, no free-text entry accepted, no "Other" option.
- Submit without selection → blocked client + server side.
- Submit with a committee member selected → saves, appears under that inviter in admin.
- DB check: new `rsvps.invited_by` values all match a committee name.
