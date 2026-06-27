## First: nothing has been lost

I queried the database directly. The numbers right now:

- **101 guests uploaded total** (every invitation row, committee + guests)
- **35 confirmed** (yes), **14 declined** (no), **52 pending** (no RSVP yet)
- **Phyllis Andrews** — `(402) 298-1447` — uploaded 2026-06-03, RSVP status = **no (declined)**. She is in the data. She is counted in the "Declined: 14" tile.
- **Randy Andrews** is also there as declined.

The page that shows every one of these 101 people already exists at **`/admin/guests`** (the "Guests uploaded" tile and every status tile on the admin dashboard link to it, with a filter pre-applied). When you tap "Declined", you'll see all 14 names including Phyllis. I'll verify this end-to-end on the admin route as part of the fix.

## Why you got dumped on the front page

I traced it. When you clicked "View as Committee", the committee workspace renders fine inside `/admin`, but one of the cards on it (the event date/time card) is a link pointing to `/` — the public home page. Tapping that — or anything that scrolled to it — yanks you off the admin route entirely, so on your next click you're on the public site, not the dashboard. That's the bug. It is not a sign-out and no data is gone; it's just bad navigation.

## What I want to change (small, targeted)

1. **Stop "View as Committee" from escaping admin.**
   - In `src/components/committee-workspace.tsx`, change the `<Link to="/" hash="datetime">` event-time card so it does NOT navigate away from admin. Two options — I'll do (a) by default:
     - (a) Render the date/time inline as plain text (no link). It's already shown on the card itself; the link adds nothing.
     - (b) If you want it clickable, open `/` in a new tab (`target="_blank"`) so your admin tab is untouched.
   - Add a small sticky pill at the top of the committee preview that reads **"Previewing as Committee · Back to Admin Dashboard"** so you can always get out in one tap, no matter what.

2. **Make the full roster impossible to miss from `/admin`.**
   - Add a prominent banner at the top of the admin dashboard: **"101 guests uploaded — view full list"** linking to `/admin/guests`. (Today the count is there but it sits inside the Guests card; this surfaces it.)
   - On `/admin/guests`, add a one-line summary header: **"Showing X of 101 total"** that updates as filters change, so the total is always visible.

3. **Verification before I say it's done** (per your rule):
   - Drive the admin route in a headless browser as an admin session, click "View as Committee", confirm I stay on `/admin` and the new "Back to Admin Dashboard" pill is visible.
   - Click the new "101 guests uploaded" banner, confirm I land on `/admin/guests` and the page lists all 101 rows.
   - Click the "Declined" tab, confirm I see exactly 14 rows and that **Phyllis Andrews** is in the list.
   - Screenshot each step. If any one of those checks fails I will not call it fixed.

## Files I'd touch

- `src/components/committee-workspace.tsx` — remove/neutralize the `<Link to="/" hash="datetime">`; add the sticky "Back to Admin Dashboard" pill (only when rendered from the admin preview).
- `src/routes/_authenticated/admin/index.tsx` — add the "101 guests uploaded — view full list" banner above the existing cards.
- `src/routes/_authenticated/admin/guests.tsx` — add the "Showing X of 101 total" header line.

No database changes. No deletions. No changes to anyone's RSVP. No changes to login or session handling.

## Confirm before I build

- OK to make the event date/time on the committee preview **plain text instead of a link** (option a)? Or would you rather it open the public page in a **new tab** (option b)?
- Anything else you want surfaced on the new `/admin/guests` header — e.g. last-uploaded date, sortable columns, a way to mark someone as "I personally invited this person"?
