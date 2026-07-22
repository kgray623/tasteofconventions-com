2026-07-22 21:20 UTC

## Why Aisha Moore "disappeared"

She did not disappear from a delete. The deletion archive has zero rows for "Aisha", "Moore", or any spelling variant. The only related archive entry is **Mysha Woods** removed from the `inviters` table on 2026-07-18 (no deleter recorded — likely a cascade or migration, not a user click).

Aisha Moore was never in `invitations`, `inviters`, `team_invites`, or `profiles` as her own record. She only existed as free-text in Anita Lindell's `invited_by` field on an old RSVP. Last turn I created a fresh `inviters` row for her and linked Anita to it — that is why she now shows up under Committee Guests. Nothing was ever deleted for Aisha; there was simply no record to begin with until I made one.

## Full audit of everything deleted (last ~60 days, from `deleted_rows_archive`)

Counts by table (last 30 days): invitations 23, rsvps 12, inviters 9, cuisine_preorders 5, team_invites 3.

### What I will deliver

1. **One consolidated audit report** listing every archived deletion with: date/time (UTC), table, name, phone, who deleted it (name + phone), and whether the deletion looks legitimate (test/junk row, duplicate cleanup, admin action) or suspicious (real guest, no deleter recorded, cascade side-effect).

2. **A separate "review these" shortlist** of deletions that look like they may have been real people or real submissions and might need restoring — starting candidates from what I already see:
   - Mysha Woods (inviters, 2026-07-18, no deleter)
   - Rhonda Wilcher (invitations, 2026-07-11, no deleter)
   - Jeannette Adjetey preorder (2026-07-19, no deleter)
   - Jana Weinberger / Yetunde Adejunmobi preorders (no deleter)
   - Jamie Elker (inviters, 2026-06-29, no deleter)
   - The 8 rsvps deleted by Kari Gray on 2026-07-22 with no guest name attached (need to expand row_data to see whose RSVPs those were)

3. **No restoring anything yet.** For each row on the shortlist I will show you the archived contents and wait for your explicit yes/no before restoring. Existing data stays untouched.

4. **Delivery format:** both an on-screen table in chat and a downloadable CSV at `/mnt/documents/deletion-audit_2026-07-22.csv` so you can share it.

### Technical notes

- Source of truth: `public.deleted_rows_archive` (populated by the `archive_deleted_row` trigger on invitations, rsvps, inviters, team_invites, cuisine_preorders).
- Rows with `deleted_by_name = NULL` mean either a cascade delete, a SQL migration, or a system trigger — I will flag those separately from user-initiated deletes.
- The existing `/admin/recently-deleted` page already shows the last 30 days with a Restore button; I will point you to it after you review the shortlist so you can restore any yourself with one tap.
- I will NOT modify `deleted_rows_archive`, restore anything automatically, or delete anything else during this audit.
