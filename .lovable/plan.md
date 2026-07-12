## What's happening

Kari Gray's inviter row currently has:
- `quota = 50` (approved amount)
- `requested_quota = 51` (leftover pending request from 7/9)

Audit log confirms: on 7/9 an admin approve set both `quota` and `requested_quota` to 51. On 7/12 an admin lowered `quota` to 50 directly, but `requested_quota` was left at 51. Nothing in the code is auto-adding +1 — the 51 is stale data being surfaced as a "pending request."

Also: when the committee submit path writes a fresh request, it currently overwrites `requested_quota` but does NOT clear `quota_requested_at` staleness in one specific case, and the admin's direct-edit-quota path (inviters page) does not sync `requested_quota` at all — that's what created the drift in the first place.

## Fix (Update UTC: 2026-07-12)

1. Data cleanup (one-time SQL migration): for every inviter where `requested_quota IS NOT NULL AND requested_quota = quota` OR `requested_quota < quota`, set `requested_quota = NULL`, `quota_request_note = NULL`, `quota_requested_at = NULL`. This clears Kari's stale 51 and any similar rows. No submitted user data is dropped — `quota` (the source of truth) is preserved.

2. Forward-fix in `src/routes/_authenticated/admin/inviters.tsx` (admin editing quota directly): when an admin saves a new `quota` value, also clear `requested_quota`, `quota_request_note`, `quota_requested_at`. That way manually lowering an approved quota doesn't leave a phantom pending request behind.

3. Forward-fix in the approve path (already correct — line 206-207 sets `quota: inv.requested_quota, requested_quota: null`). Verify no regression.

4. Verify end-to-end after changes:
   - Read Kari's row: `quota=50`, `requested_quota=null`.
   - Load `/admin?view=committee` as Kari's account, confirm "RSVP requests" shows 50, no "pending 51" banner anywhere.
   - Load `/admin` inviters page as admin, confirm no yellow "Requesting 51" chip on Kari.

## What is NOT changing

- The committee submit path already writes exactly the number entered (no +1 anywhere).
- No changes to counts, RSVP logic, or guest data.
- No admin/committee/guest tab behavior changes.

## Technical notes

- Migration: single UPDATE on `public.inviters`.
- Edit-quota handler in `inviters.tsx` (around line 200-215): extend the update payload with the three cleanup fields.
