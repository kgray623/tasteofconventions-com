## 1. Point-in-time restore (the 74 missing invitations)

I cannot restore them from inside the app. Lovable Cloud takes daily backups, but initiating a restore is a support action.

**What you do (manual — no code change):**
- Open Lovable support chat from the workspace menu.
- Send this message verbatim:

> Project: tasteofconventions (ref `jqlrwcembabqlqoxeliq`). I need a point-in-time restore of the `public.invitations` table to **2026-06-15 12:00 UTC** (or the latest backup before that). Current row count is 94; expected ~168. Please restore into a side table (e.g. `invitations_restore_2026_06_15`) so I can diff and re-merge, not overwrite the live table.

I'll set up the merge script the moment they hand back the side table — that part I can do.

## 2. Deletion audit + soft-delete (so this can't repeat)

Migration on `public.invitations`:

- Add `deleted_at timestamptz`, `deleted_by uuid` columns. Default queries still ignore soft-deleted rows because the existing select policies filter on owner/committee and we'll add `AND deleted_at IS NULL` to the admin list query.
- Add a trigger `audit_invitations_change` that uses the existing `public.audit_row_change()` function for INSERT/UPDATE/DELETE on `invitations` (the function is already defined, just never attached).
- Add the same trigger on `rsvps`, `inviters`, `team_invites`, and `cuisine_preorders` so every guest-data mutation is recorded.
- Switch the admin "Delete invitation" action from `DELETE` to `UPDATE invitations SET deleted_at = now(), deleted_by = auth.uid()`. Add a small "Recently deleted (last 30 days)" panel on `/admin/invitation` with a one-click **Restore** button (sets `deleted_at = null`).
- Keep hard-delete behind a separate "Purge" action for admins only, which still hits the audit trigger.

That gives you: a) a complete log of every future mutation in `audit_log`, b) one-click restore for accidental deletes for 30 days, c) no breaking change for the rest of the app.

## 3. Duplicate-flag count vs visible list (5 vs 2)

Confirmed from the DB: there are **5 rows** in `duplicate_flags` covering **3 distinct invitation pairs** (Michelle, Shelley, Sofia). Two pairs are flagged twice (once for `phone`, once for `name`), so the badge inflates the number and the list may collapse identical pairs.

Fixes:
- `src/routes/_authenticated/admin/index.tsx` — change the badge query to count distinct `(LEAST(invitation_a, invitation_b), GREATEST(invitation_a, invitation_b))` pairs instead of raw rows. Done via a SQL view `duplicate_flag_pairs` (one row per pair, with `match_types text[]` aggregating phone/name/email).
- Wherever the duplicates list is rendered, read from `duplicate_flag_pairs` so badge count and visible rows agree. I'll also add a "Resolved" toggle: an admin action that deletes both flag rows for a pair after they confirm they're the same person (and optionally merges into one invitation).
- This is the only path that makes "5 flags" and "2 visible" reconcile — the answer is "3 pairs, shown as 3 cards".

## Files touched

- New migration: soft-delete columns + audit triggers + `duplicate_flag_pairs` view.
- `src/routes/_authenticated/admin/index.tsx` — badge query.
- `src/routes/_authenticated/admin/invitation.tsx` (or wherever invitations are listed) — filter `deleted_at IS NULL`, add Recently Deleted panel, swap delete action to soft-delete.
- `src/lib/invitations.functions.ts` — add `softDeleteInvitation`, `restoreInvitation`, `resolveDuplicatePair` server fns.
- The duplicates list view — read from the new view.

## What you'll see when done

- Admin home badge: "3 possible duplicates" (matches what you see on screen).
- Each duplicate card shows the match reasons as chips ("phone", "name") and has a **Resolve** button.
- Delete on an invitation moves it to a Recently Deleted list for 30 days; one click restores it.
- Every future change to invitations/rsvps/inviters/team_invites is recorded in `audit_log` with user, IP, before/after.