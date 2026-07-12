## Add a "Latest upload" tab to the guest list

On `/admin/upload`, the "Current guest list" today only shows everyone sorted alphabetically inside RSVP-status sections. When you just imported Tina's CSV, those new rows are scattered across the alphabet, so you can't easily fire SMS invites to just the batch you uploaded.

### What I'll change

Only `src/routes/_authenticated/admin/upload.tsx`. No schema, no server functions, no changes anywhere else.

1. **Load `created_at`** on the saved-guests query (currently the select list omits it). Store it on each row in `savedGuests`.
2. **Compute "latest upload batch"** on the client: take the max `created_at` across all saved guests, then include every row whose `created_at` is within a 60-minute window of it. That reliably captures a single CSV import (which writes rows in the same second or two) without needing a new `import_batch_id` column.
3. **Add a two-tab toggle** at the top of the Current guest list card:
   - **All guests** (current alphabetical, status-grouped view — unchanged)
   - **Latest upload (N)** — shows only the batch rows above, sorted newest first (most recently created at the top), NOT re-alphabetized, NOT grouped by RSVP status. Also shows the batch timestamp ("Uploaded Jul 12, 2:14 PM · 47 guests").
4. **Reuse the exact same row component** so every row in the Latest-upload tab keeps the orange **Send SMS / Resend SMS** button, the "I sent the text" checkbox, edit-name, delete, committee toggle, etc. — identical behavior, just a different filter + sort.
5. If there are no saved guests yet, the tabs are hidden (same empty state as today). If everyone is older than 60 min from the newest row, "Latest upload" still shows just that newest row (edge case: single add).

### Out of scope

- No new database column, no import_batch tracking table.
- No changes to `/admin/guests` (reconciliation view).
- No changes to `buildSmsBody`, the SMS link format, or the "Mark as sent" flow.
- No bulk "send all" — SMS is still one tap per row (project rule: texts come from the committee member's own phone).

### Technical notes

- Add `created_at` to the `.select(...)` string on line 320 and to the `Row` type + `savedGuests` state shape.
- New local `activeListTab` state: `"all" | "latest"`, default `"all"`.
- New `useMemo` for `latestBatch`: `const maxTs = Math.max(...saved.map(g => +new Date(g.created_at))); return saved.filter(g => maxTs - +new Date(g.created_at) <= 60*60*1000).sort((a,b) => +new Date(b.created_at) - +new Date(a.created_at));`
- In the render block around line 1665, branch on `activeListTab`: `"all"` keeps the existing sections; `"latest"` renders one flat `divide-y` list of `latestBatch` using the same row JSX (extract into a small inline helper to avoid duplication).

Timestamp: 2026-07-12 UTC.