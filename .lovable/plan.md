Add the same organizing controls to the committee dashboard (`/admin`) "My Guests" section that were added on `/admin/upload`.

## What to change

File: `src/components/committee-workspace.tsx` — the "My Guests" card that currently splits into In person / Zoom / Pending / Declined sub-lists.

Add above the list:

1. **Filter tabs** — All / Confirmed / Pending / Declined / Latest upload
   - "Confirmed" merges In-person + Zoom
   - "Latest upload" = rows uploaded within 60 min of the newest `created_at` (same rule as the upload page)
   - Each tab shows a live count
2. **Sort dropdown** — Grouped by status (default when tab = All) / Alphabetical (A–Z) / Newest first / Oldest first
   - When any status tab is active, "Grouped by status" is hidden and default is Alphabetical
   - "Latest upload" is fixed to Newest first (dropdown hidden, like the upload page)
3. Keep the existing collapsible section headers (Pending / Confirmed / Declined) for the default grouped view.
4. Keep the existing "Pending order" select (already there for the pending subsection) — the new global Sort supersedes it when a flat view is chosen, so remove the now-redundant "Pending order" control to avoid two competing sorts.

No changes to data fetching, RSVP logic, duplicate detection, quotas, or the sticky "Upload guest list" button. Only the presentation of the "My Guests" list.

## Verification

After the edit I will run Playwright against `/admin` on 384×673, sign in with the injected committee session, screenshot: (a) default view, (b) after clicking Confirmed tab, (c) after switching sort to Newest first, (d) after switching to Latest upload — and confirm counts and ordering match the DB.

Timestamp: 2026-07-15 18:34 UTC.
