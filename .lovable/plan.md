## Full dataset export (XLSX)

Generate a single Excel workbook with every relevant record from the live database so it can be uploaded to another AI. Data-read only — no app code changes.

**Timestamp:** 2026-07-16 UTC

### Workbook: `taste-of-conventions_full-dataset_2026-07-16.xlsx`

One sheet per table/view, no filtering, no column omissions (except password/token secrets that would be useless outside the app — see note):

1. **Guests (Invitations)** — id, guest_name, guest_phone, is_committee, invite_sent_at, inviter_id, host_id, event_id, rsvp_token, created_at
2. **RSVPs** — invitation_id, status (yes/no/maybe/waitlist/pending), party_size, attendance_mode (in-person/zoom), ordering_food, responded_at
3. **Committee / Subcommittee (Inviters)** — id, name, phone, host_id, quota, requested_quota, active, created_at
4. **Team members (user_roles + profiles + auth phone)** — user_id, display_name, phone, role (admin/team/host)
5. **Team invites** — name, phone, role, accepted_at, created_at
6. **Cuisine pre-orders (meals)** — id, invitation_id, name, phone, selections (expanded: one row per cuisine × qty), updated_at
7. **Meals summary** — per guest: name, phone, Myanmar qty, African qty, Indonesian qty, Other qty, total
8. **Reconciliation roll-up** — one row per invitation joining guest + RSVP + meal totals + inviter name (same shape as the admin Reconciliation export)
9. **Entertainment submissions** — name, phone, act description, media info, created_at
10. **Donations summary** — all rows
11. **Events** — all rows
12. **Restaurants / Menu items** — for cuisine reference
13. **Categories / Category assignments** — volunteer group structure

### Method

- Query the database directly via psql (read-only) for each table.
- Build the workbook with openpyxl following the xlsx skill (frozen header row, autosize columns, bold headers).
- QA: open the file, verify row counts match `SELECT count(*)` per table, spot-check 3 guests end-to-end (guest → RSVP → meals).
- Save to `/mnt/documents/` and share via `<presentation-artifact>`.

### Notes

- Phone numbers included in full (needed for the credential rule: username = last name, password = phone number).
- Auth password hashes, RSVP tokens beyond what's already in invitations, and internal Supabase system columns are excluded — they are not useful to an external AI and are sensitive.
- No email columns will be included for guests/submissions (per project rule: phone/SMS only).
