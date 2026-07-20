## Plan

Both warnings shown in your screenshot were already fixed in the database in the previous turn:

- **Volunteers can self-assign with arbitrary name** — `category_assignments` INSERT policy now requires `volunteer_name` to match the caller's own `profiles.display_name`.
- **No controlled way to create own profile row** — `profiles` now has a self-scoped INSERT policy (`auth.uid() = id`) and an admin-only DELETE policy.

Verified live in the database via `pg_policies` before writing this plan — no additional schema change is needed.

### Steps

1. Trigger a fresh security scan so the scanner re-reads the current policies.
2. Report back which warnings cleared and which (if any) still remain.

Timestamp: 2026-07-20 UTC.
