## Goal

Attribute the last two guest-list uploads (25 invitations total) to **Tina Santana**, and put the plumbing in place so every future upload can be tied to the person who brought the list.

## The two batches being attributed

- **Jul 14, 2026 20:42 UTC** — 4 guests (Bob & Deanna Sadler, … Latea Glenn)
- **Jul 11, 2026 21:50 UTC** — 21 guests (Ana Coronado, … Veronica Del Hoyo)

Both uploaded by the same admin account (`host_id 00651c0f-…`). Total: **25 invitations** — matches Tina's quota of 25.

## What changes

### 1. Database (one migration)

- Add row to `inviters`: name "Tina Santana", quota 25, active true, phone null (can be filled in later from the Inviters admin page).
- Add nullable `inviter_id uuid REFERENCES public.inviters(id) ON DELETE SET NULL` to `invitations`, plus an index on it.
- Backfill: set `inviter_id = <Tina's id>` on the 25 invitations from those two exact `created_at` batches (uploaded by that host, within those minute windows).
- No changes to RLS, GRANTs, or existing columns. Nothing is deleted or overwritten.

### 2. Admin UI — display attribution

- **Guests page** (`/admin/guests`): show "Brought by: {inviter name}" under each guest row when `inviter_id` is set. Add "Brought by" as an option in the existing sort/filter area so you can group Tina's list together.
- **Inviters page** (`/admin/inviters`): show a "Guests brought" count next to each inviter's quota (X of Y).
- **CSV export**: add an `inviter` column.

### 3. Upload flow — pick who brought the list

- **Admin upload page** (`/admin/upload`): add a required "Whose list is this?" dropdown at the top of the upload form, populated from active `inviters`. The chosen inviter is written to `inviter_id` on every invitation created in that upload batch (screenshot extract, CSV, manual).
- **New invitation page** (`/admin/invitations/new`): same dropdown, optional (for one-offs not tied to a specific inviter).

No forward-fix trigger — we can't infer who brought a list from data alone. The dropdown is the forward-fix.

## Explicitly NOT changing

- No email columns touched. No email UI reintroduced.
- No changes to RSVP math, quota enforcement, or waitlist rules.
- No changes to public-facing routes.
- Existing 25 rows keep their `host_id`, `created_at`, `rsvp_token`, notes — only `inviter_id` gets set.

## Verification (before saying "done")

1. DB read-back: `SELECT COUNT(*) FROM invitations WHERE inviter_id = <Tina>;` returns **25**, split 4 + 21 across the two timestamps.
2. `/admin/inviters` shows "Tina Santana — 25 of 25 guests brought".
3. `/admin/guests` at your current mobile viewport (384×673) shows "Brought by Tina Santana" on a spot-checked row from each batch (e.g. Bob & Deanna Sadler, Ana Coronado).
4. `/admin/upload` renders the "Whose list is this?" dropdown, is required, and a test upload writes `inviter_id` on the new rows (verified by DB read-back).
5. CSV export contains the new `inviter` column with "Tina Santana" on those 25 rows.
