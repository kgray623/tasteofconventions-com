# Volunteer Reliability and Security Verification

**Current verified state — 2026-08-03 00:31 UTC**
- Fresh dependency scan: **no high or critical vulnerabilities**.
- Fresh comprehensive backend security scan: **no findings**.
- Fresh database linter: **no findings**.
- The database currently has **16 volunteer responsibilities** and **50 retained assignments**; no assignment is missing both an account and a name.
- No duplicate account/category assignments currently exist, but the database has no uniqueness guard to prevent a rapid double-submit from creating one.
- Volunteer signup currently exists in two UI paths: `/volunteer` and `/admin/categories`; both call the authenticated server functions, while admin/category list loading still uses separate direct browser reads.

## 1. Reproduce every volunteer path before editing
- Test the exact mobile viewport in use: **384 × 681**.
- Sign in through the real last-name/phone-number login flow as a guest, committee member, and admin.
- Open `/my-rsvp`, follow **Volunteer to help**, and verify `/volunteer` loads every current responsibility.
- For each role, capture the actual failing request/error and trace it through route → button → server function → database policy/write.

## 2. Make one dependable signup implementation
- Keep all existing responsibilities and submitted volunteer records intact.
- Consolidate self-signup, withdrawal, category loading, and read-back around the authenticated server-function path rather than maintaining competing browser/database implementations.
- Preserve admin/committee name-based assignment and existing name-only volunteers.
- Return explicit errors for missing categories, unauthorized actions, failed reads, failed writes, and failed read-backs instead of silently showing an empty list.
- Add per-category busy states so repeated taps cannot send duplicate requests.
- Ensure the selected state, assignment count, and withdrawal state update only after the stored row is read back successfully.

## 3. Prevent duplicate or lost assignments
- Add a database uniqueness guard for one account per responsibility while leaving name-only admin assignments untouched.
- Make signup idempotent: an existing assignment is treated as success and returned to the UI.
- Keep withdrawal limited to the volunteer’s own assignment unless an authorized committee/admin user performs it.
- Verify the auth bearer token reaches every protected volunteer server function and that ownership is always derived from the authenticated user.

## 4. Keep volunteer access reachable
- Verify `/volunteer` remains available to every signed-in guest, committee member, and admin—not only committee/admin users.
- Preserve the `/my-rsvp` volunteer link and ensure login/session recovery returns users to `/volunteer` instead of sending them to an unrelated dashboard.
- Confirm every responsibility card has a usable signup/withdraw control on mobile with clear saved, busy, and error states.

## 5. End-to-end verification for every responsibility
For **each of the 16 current responsibilities**:
1. Sign up using the real mobile UI.
2. Read the new assignment directly from the database and confirm the authenticated account owns it.
3. Refresh `/volunteer` and confirm it remains selected and its count is correct.
4. Confirm it appears in the volunteer’s own list/chat access where applicable.
5. Withdraw using the UI.
6. Confirm the database row is removed and the refreshed UI/count match.

Also verify:
- committee/admin name-based assignment and removal;
- unauthorized users cannot assign or remove another person;
- rapid double-taps create only one assignment;
- existing 50 assignments remain present unless the specific test assignment is intentionally created and removed.

## 6. Final scans and evidence
- Re-run the dependency scan, comprehensive security scan, persisted findings check, and database linter after the changes.
- Resolve only findings actually corrected; do not ignore or alter unrelated findings.
- Report security results separately from volunteer results, with route, viewport, role, database write/read-back, and any unverified limitation stated explicitly.