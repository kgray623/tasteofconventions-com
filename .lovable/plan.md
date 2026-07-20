2026-07-20 01:20 UTC — Plan to address both problems without touching unrelated features.

## What I verified first
- The persisted security findings currently show no active findings, but a fresh scanner run still reports warnings:
  - 12 warnings are database `SECURITY DEFINER` function exposure warnings.
  - 1 warning is the volunteer/category assignment identity check.
  - 1 warning is the invitation-media storage write scope.
- The traffic panel is not matching the live Lovable visitor count because the in-app backfill table has stale/incomplete rollup data for today: database rollup currently has 1 visitor / 1 pageview for 2026-07-20, while Lovable analytics now reports 3 visitors / 31 pageviews for 2026-07-20 and 1,068 visitors / 2,921 pageviews since 2026-05-20.
- The current traffic code uses historical rollup rows as the source of truth when present, so a stale same-day rollup can make the panel drop or disagree after refresh.

## Fix plan

### 1. Clear the security warnings correctly
- Add a database migration to tighten function execution permissions:
  - Remove anonymous/public execution from internal trigger/helper functions.
  - Keep only the functions the app actually calls available to the correct role.
  - Avoid breaking login, role checks, chat unread counts, invitation search, email queue processing, and server-side auth helpers.
- Tighten the invitation-media storage write rule so team/admin uploads are scoped to approved asset paths instead of broad bucket-wide write access.
- Review the volunteer/category assignment policy and either strengthen it to require the caller’s `user_id` and profile identity together, or mark it fixed if the current policy already enforces that after the migration.
- Re-run the scanner and then use `manage_security_finding` only for findings actually fixed or verified as resolved.

### 2. Make the traffic panel stop showing stale math
- Refresh the historical traffic rollup with the current Lovable analytics values through 2026-07-20:
  - Expected current all-time baseline from Lovable analytics: 1,068 visitors and 2,921 pageviews for 2026-05-20 through 2026-07-20.
- Change the admin Site Traffic panel logic so same-day data is never treated as final historical rollup:
  - For completed past days, use the Lovable analytics rollup.
  - For today, use the larger/current source or clearly label it as “today so far” so it does not look like bad bookkeeping.
- Add a visible “Last synced” / source note so the number shown on `/admin` explains whether it is Lovable history or live in-app tracking.

### 3. Verify before calling it fixed
- Re-run the security scanner and confirm there are no remaining actionable warnings from the fresh result.
- Verify the database rollup totals match the Lovable analytics totals after backfill.
- Open `/admin` as admin and confirm the Site Traffic card shows stable all-time visitor/pageview totals and no misleading same-day drop.

## Technical notes
- This requires one database migration for permissions/policies and one small code change in the site traffic server function/card.
- I will not change RSVP math or guest counts in this pass unless verification shows this specific screen is actually using RSVP data; the screenshot is Lovable publishing/analytics traffic, not RSVP attendance math.