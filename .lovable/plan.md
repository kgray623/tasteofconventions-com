## Problem

The **Steering committee invitations & usage** card only shows 4 people (Jamie Elker, Kari Gray, Melissa Novotne, Sarah Campbell) because it renders from the `inviters` table, which currently has 4 rows.

Your committee is actually larger:
- 4 rows in `inviters`
- 4 rows in `team_invites` (Jacquelyn Spears, Jamie Elker, Jen Spears, Sarah Campbell)
- 8 invitations flagged `is_committee = true` (Betsaida Ruiz, Dewinica Salis, Jay & Rhonda Wilcher, Melissa Novotne, Michelle Shawger, Saul Morro, Shelley & Pat Monahan, Teresa Drake)

After deduping by phone/name, that's ~10 people who should be on the list but aren't.

## Root cause

`inviters.tsx` already has a backfill block (lines 277-312) that inserts any missing committee members into `inviters` with `quota: 0`. It's guarded by `if (isActualAdmin)` and runs inside `load()`.

`useRoles()` is async, so on the first mount `isActualAdmin` is still `false`, the backfill is skipped, and `load()` is never re-run when the role resolves. That's why only the 4 manually-added inviters show up.

## Fix

1. **One-time backfill (data):** insert an `inviters` row for every committee member (from `team_invites` where `role='team'` and from `invitations` where `is_committee=true`) that isn't already represented in `inviters` (match on normalized phone, fall back to name). Set `quota = 0`, `active = true` so admins can allocate seats from the UI.

2. **Make the auto-sync reliable going forward (code, `src/routes/_authenticated/admin/inviters.tsx`):**
   - Wait for `useRoles()` to finish before running `load()` (don't run with stale `isAdmin=false`).
   - Re-run `load()` when `isActualAdmin` flips to `true`.
   - Keep the existing dedupe-by-phone-then-name behavior.

3. **No UI/visual changes.** The card layout, copy, quota controls, and quota-request flow stay exactly as they are. New rows simply appear in the existing list with quota 0 until you assign a quota.

## Out of scope

- No changes to how RSVPs count against quota.
- No changes to the Steering Committee list on `/admin/team`.
- No deletion of any existing inviter, team invite, or committee-flagged invitation.
