**2026-07-22 UTC — Safeguard against silent deletes**

Goal: no guest, committee, inviter, RSVP, or team-invite row can leave the live tables without (a) an explicit admin action, (b) a typed reason, and (c) an audit_log entry — even if a future bug, a stray RPC, or a direct SQL call tries to delete it. Restore path (Recently Deleted) stays intact.

## What changes

### 1. Database — deletes must be "claimed" first
Tables in scope: `invitations`, `rsvps`, `inviters`, `team_invites`, `cuisine_preorders`, `user_roles`, `category_assignments`.

- Add a `BEFORE DELETE` trigger `guard_protected_delete` on each table.
- Trigger raises `PROTECTED_DELETE: use admin delete flow` unless the session has claimed the delete via a new SECURITY DEFINER function `public.admin_claim_delete(target_table text, target_id uuid, reason text)` that:
  1. Verifies `auth.uid()` has `admin` role (via existing `private.has_role`).
  2. Requires `reason` length ≥ 5.
  3. Sets a per-transaction GUC `app.delete_claim = '<table>:<id>'`.
  4. Writes a row to `audit_log` with action `CLAIM DELETE <table>`, target_id, and reason in metadata.
- Trigger reads the GUC, matches `<table>:<id>`, then clears it so a single claim can only delete one row. Existing `archive_deleted_row` + `audit_row_change` triggers still fire, so restore continues to work.

### 2. Server functions — one blessed delete path
- New `deleteProtectedRow` in `src/lib/invitations.functions.ts` (auth-required, admin-verified) that:
  1. Calls `admin_claim_delete(table, id, reason)`.
  2. Runs the actual `DELETE` in the same transaction via a new RPC `admin_execute_delete(table, id)` (SECURITY DEFINER, admin-only, whitelisted table names).
  3. Returns `{ ok, archive_id }`.
- Update existing delete call sites (guests page, inviters page, team page, preorders page, RSVP admin, categories page) to call `deleteProtectedRow` with a reason prompt. No component may issue a raw `.delete()` on a protected table.

### 3. UI — confirm + reason
- Add a small `ConfirmDeleteDialog` (name of row + required "Why are you deleting this?" textarea, min 5 chars).
- Replace inline `confirm(...)` calls on protected tables with this dialog.
- Recently Deleted page unchanged; it already restores from archive.

### 4. Verification (must pass before I call this done)
- Playwright as admin on mobile viewport: try delete without reason → blocked; delete with reason → row disappears from live list and appears in Recently Deleted with the reason and my name.
- DB check: attempt raw `DELETE FROM public.invitations WHERE id = ...` via psql → fails with `PROTECTED_DELETE`.
- DB check: audit_log shows the CLAIM DELETE row and the DELETE row with matching target_id.
- Confirm restore from Recently Deleted still works end-to-end.
- Confirm normal writes (insert/update) on all in-scope tables are unaffected.

## Out of scope
- Automated undelete / trash bin UI beyond the existing Recently Deleted page.
- Any change to guest-facing routes or RSVP flow.
- Backfilling reasons for past deletions.

## Technical notes
- `admin_claim_delete` and `admin_execute_delete` are SECURITY DEFINER, `search_path = public`, EXECUTE granted only to `authenticated` and gated by `private.has_role(auth.uid(), 'admin')`.
- Table whitelist enforced inside `admin_execute_delete` using `format('DELETE FROM public.%I WHERE id = $1', target_table)` after checking against an allow-list.
- GUC is transaction-scoped (`SET LOCAL`), so it cannot leak between requests.
- No changes to `deleted_rows_archive` schema — the existing `archive_deleted_row` trigger continues to capture the row for restore.
