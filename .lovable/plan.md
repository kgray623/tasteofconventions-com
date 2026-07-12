## Restore three-category guest list: RSVP / Pending / No

Undo the extra collapse behavior I added on all headers. Only the "No" section stays collapsed by default; the other headers go back to plain, non-collapsible labels like they were before.

### Change (only in `src/routes/_authenticated/admin/upload.tsx`)

1. **Rebuild the section list to exactly 3 categories**, in this order:
   - **RSVP** — rows where effective status is `yes`.
   - **Pending** — rows where effective status is `waitlist`, or anything not `yes` / `no` (i.e. today's "No response yet" + "RSVP waitlist" merged).
   - **No** — rows where effective status is `no`. Kept in the DB, rendered at the bottom, **collapsed by default**. Header still shows the count (e.g. "No (12)") so you know they're there; click to expand.

2. **Remove the collapse toggle from RSVP and Pending headers.** They render as the original plain sticky label (`<div>...</div>`), not a button. No chevrons.

3. **Keep the collapse toggle only on the "No" header** (chevron + button), defaulting to collapsed. `collapsedSections` state stays but only "No" reads/writes it.

4. **No data changes.** No migration, no status rewrites. Waitlist rows keep `rsvp_status = 'waitlist'` in the DB — they're only *grouped under* Pending in the UI.

### Out of scope

- No changes to Latest-upload tab, SMS button, or any row-level controls.
- No changes to `/admin/guests`, RSVP totals card, or any counts elsewhere.
- No schema changes.

Timestamp: 2026-07-12 UTC.