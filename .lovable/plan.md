## Goal
On the admin overview (`/admin`), add a "View as…" row with three buttons so you can preview the app from each role's perspective.

## Buttons

1. **View as Guest** → opens `/rsvp/<token>` in a new tab
   - Picks the most recent non-committee invitation that has an `rsvp_token` (server-side, single query, ordered by `created_at desc limit 1`).
   - If none exist, button is disabled with tooltip "No guest invitations yet".
   - Read-only preview — opens in a new tab so your admin session stays intact in the current tab.

2. **View as Committee** → opens `/dashboard` in a new tab
   - That route is the committee/host workspace (where a committee member manages their own invitations & RSVPs).
   - No data swap — it just renders for *your* user. Since you're also a committee member, this shows the committee experience as-is.

3. **View as Admin** → opens `/admin` in a new tab
   - Included for symmetry / quick "open a fresh admin tab" use.

## Placement
A new compact `Card` near the top of `/admin` titled **"Preview dashboards"**, with the three buttons in a row (icon + label). No layout shift to existing sections.

## What I will NOT do
- No impersonation / session swap. Buttons 2 & 3 render as your own user; button 1 just opens a public RSVP URL (which is what the guest sees from SMS anyway).
- No new DB columns, migrations, or server functions beyond a tiny query to fetch one guest token. If `/admin` already loads invitations, I'll reuse that instead of a new fetch.
- No changes to `/dashboard`, `/rsvp/$token`, or any guest-facing UI.

## Files touched
- `src/routes/_authenticated/admin/index.tsx` — add the new card + the one-row fetch for a sample guest token.
