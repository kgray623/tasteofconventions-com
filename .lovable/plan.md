## What happened (verified)

- Phyllis Andrews is in `invitations` (uploaded 2026-06-03) and in `rsvps` with `status=no` (declined 2026-06-08). She is being counted in the "Declined: 14" tile.
- **Nothing was dropped.** All 14 declined guests are present in the database. Full list confirmed.
- The reason it *looks* missing: the dashboard tiles only show **counts**. Clicking "Declined" goes to `/admin/my-rsvp` (your own RSVP page), not a list of declined guests. Same for Confirmed, Pending, Maybe, Waitlist. There has never been a guests-by-status list in the UI.

## Fix: build a real Guests list

Add a single new admin page **`/admin/guests`** that lists every uploaded guest with their RSVP status, party size, attendance mode, phone, and responded date. Frontend-only — uses existing `getReconciliationRows` server function, no schema changes.

Features on `/admin/guests`:
- Filter tabs at top: **All · Confirmed · Declined · Maybe · Waitlist · Pending** (counts shown on each tab, matching dashboard).
- Search box (name or phone) — instant client-side filter.
- Sortable by name, status, responded date.
- One row per guest: name, phone, status badge, party size, in-person/Zoom, responded date.
- "Open RSVP" link per row (admin view of guest's RSVP page via `rsvp_token`).
- CSV export of the currently filtered list.
- Mobile-first card layout that collapses to a table on desktop.

Wire the dashboard tiles so each stat (Confirmed in person, Confirmed on Zoom, Total confirmed, Declined, Maybe, Waitlist, Pending, Guests uploaded) links to `/admin/guests` with the matching filter pre-applied (e.g. `/admin/guests?status=declined`). The "Declined" tile will land directly on Phyllis's row.

Add "Guests" to the admin nav (next to Backups) so the list is one tap away.

## Verification (will run before saying done)

Using a direct DB read-back (auth-injection is off this session so I cannot click as admin in Playwright):
- Confirm `/admin/guests?status=declined` returns exactly the 14 names listed above, including Phyllis Andrews.
- Confirm `/admin/guests?status=confirmed` total party size matches the dashboard's "Total confirmed".
- Confirm `Pending = uploaded − (confirmed + declined + maybe + waitlist)` matches.
- Confirm CSV export of the declined filter contains all 14 rows with phone numbers.
- Confirm linking from each dashboard tile lands on the correct pre-filtered view.

I will explicitly tell you if any guest fails to appear under the expected filter. I will not claim "done" unless every one of the 14 declined names — Phyllis included — is visible on `/admin/guests?status=declined`.

## Files touched

- `src/routes/_authenticated/admin/guests.tsx` (new)
- `src/routes/_authenticated/admin.tsx` (add "Guests" nav tab)
- `src/routes/_authenticated/admin/index.tsx` (re-point status tiles to `/admin/guests?status=…`)
- `src/lib/admin-audit.functions.ts` (extend existing reconciliation row shape with `rsvp_token` so the list can deep-link to each guest's RSVP page — no schema change, just adds a field to the SELECT)
