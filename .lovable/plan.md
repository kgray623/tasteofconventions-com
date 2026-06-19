## What's actually happening with Shelley & Pat Monahan

The RSVP is **not lost** — it's attached to a duplicate invitation row from a different inviter:

| Invitation row | Phone | Uploaded by | RSVP |
|---|---|---|---|
| **Shelley & Pat Monahan** | +1 402-639-4513 | host A | (none) |
| **Shelley Monaghan** | 4026394513 | Kari Gray | **yes, party of 2, in-person, 2026-06-14** |

Same phone (last 10 digits match). The DB trigger already flagged the pair in `duplicate_flags` (match_type = `phone`). The guest list page even shows a "possible duplicates" count — but each duplicate row only displays its **own** rsvp record, so the Monahan row looks blank while the Monaghan row shows the confirmation. Same thing will happen anywhere two inviters typed the same guest differently.

## Fix plan

Make the "Current guest list" treat a duplicate group as one guest for RSVP display:

1. In `src/routes/_authenticated/admin/upload.tsx`, after `duplicateGroups` is built, derive a `groupRsvp` map: for each group id, pick the strongest RSVP from any member (priority: `yes` > `waitlist` > `maybe` > `no` > none; on ties prefer the most recent / largest party).
2. When rendering a guest row that has no RSVP of its own but belongs to a duplicate group whose representative does, show the RSVP status, party size, and attendance mode from that sibling, with a small "via duplicate: <other name>" note so it's clear where it came from.
3. Fix double-counting in the page totals (`confirmedGuests` / `confirmedPeople` / `inPersonPeople` / `zoomPeople`): count each duplicate group at most once, using the group's representative RSVP, so adding the cross-row display doesn't inflate the numbers.
4. No DB changes, no migration, no merge of the records. The duplicate pair is left intact so the existing "possible duplicates" workflow still lets the committee decide which row to remove.

## Out of scope (ask if you want it)

- Auto-merging duplicate invitations into one row.
- Backfilling Pat's name onto the Monaghan row.
- Applying the same group-aware RSVP logic to the public/committee-facing lists (e.g. `my-rsvp`, admin audit). Happy to extend it once you confirm the upload page behaves the way you want.