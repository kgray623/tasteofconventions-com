## Add sort options to the Guests list

On `/admin/guests`, add a sort control so the list (especially under the Pending/unconfirmed tab) can be ordered by:

- **Newest first** — most recently uploaded/added at top
- **Oldest first** — earliest uploaded at top
- **Alphabetical** — by name A–Z (current default)

### Changes

1. **`src/routes/_authenticated/admin/guests.tsx`**
   - Extend `validateSearch` with `sort: "newest" | "oldest" | "alpha"` (optional, default `alpha`).
   - Add a small sort dropdown (shadcn `Select`) next to the search input / Export CSV button.
   - Apply the sort in the existing `filtered` memo:
     - `alpha` → current `a.name.localeCompare(b.name)`
     - `newest` → by upload/created date desc
     - `oldest` → by upload/created date asc
   - Persist selection in the URL via `Route.useSearch()` + `<Link>`/`navigate` so it survives refresh and shows on every status tab (not only Pending).

2. **`src/lib/admin-audit.functions.ts`** (only if needed)
   - Ensure the reconciliation row includes a `created_at`/`uploaded_at` timestamp for sorting. If it's already present in the row (e.g. `responded_at` won't work for pending), expose the invitation `created_at`. No schema change — just include the existing column in the SELECT and the returned row shape.

### Not changing

- No database schema, RLS, business logic, quotas, or RSVP behavior.
- Sort applies to all status tabs, not just Pending, since it's a lightweight UI addition and consistent behavior is simpler.

### Verification

- Load `/admin/guests?status=pending`, switch sort to Newest / Oldest / Alphabetical, confirm order changes and URL reflects `?sort=…`.
- Refresh page — selection persists.
- Confirm no regressions on other status tabs, search, and CSV export (export follows the currently sorted, filtered list).
