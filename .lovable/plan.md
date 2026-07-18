## Root cause (confirmed against the database)

Myisha is right — Joanna Hahn's invitation exists but is not linked to Myisha's inviter record, so Joanna doesn't roll up under "Myisha's guests."

Confirmed by direct DB reads:
- Invitation `Joanna hahn` (402-359-0467) has `host_id = c3160a24…` and `inviter_id = NULL`.
- Two inviter rows exist for Myisha: `Myisha Woods` (host_id `c3160a24…`) and `Mysha Woods` (host_id `37d4247b…`) — both with empty phone. Joanna's host_id matches the `Myisha Woods` row exactly.
- The scope of the bug is much larger than one guest: **213 invitations across 8 inviters** have `inviter_id = NULL` while the host_id already matches an existing inviter row. That's why per-host counts don't match "My Guests" totals — these guests exist but aren't attributed to anyone.

Affected hosts and unlinked counts:
Shelley & Pat Monaghan 51, Kari Gray 60, Dixie Frahm 33, Betsaida Ruiz 32, Myisha Woods 20, Melissa Novotne 11, Mysha Woods 4, Jamy Elker 2.

## Fix (three parts, all required per the "backfill + forward-fix" rule)

1. **Merge the duplicate Myisha inviter records.**
   Keep `Myisha Woods` (host_id `c3160a24…`). Repoint any invitations already linked to `Mysha Woods` at the kept row, then delete the `Mysha Woods` row. (Also normalize any RSVP `guest_name` spelling for Myisha, if present, per prior guidance.)

2. **Backfill existing invitations.**
   For every invitation where `inviter_id IS NULL` and there is exactly one inviter row with the same `host_id`, set `inviter_id` to that inviter. Ambiguous host_ids (more than one inviter) get skipped and reported — none exist today, but the query will be safe.

3. **Forward-fix so this can't happen to new invitations.**
   Add a `BEFORE INSERT OR UPDATE` trigger on `invitations`: if `inviter_id IS NULL` and exactly one `inviters` row shares the new row's `host_id`, auto-populate `inviter_id`. This closes the gap for every future guest an inviter (or admin) adds under their account.

## Verification (before saying "done")

- Re-run the "unlinked" query — expect 0.
- Confirm Joanna Hahn now appears under Myisha's guest list on `/admin/guests` filtered by Myisha, and in Myisha's own committee view.
- Spot-check the 7 other affected hosts: their "My Guests" totals should jump by the numbers above, and the "everyone" total should stay unchanged.
- Insert a synthetic test invitation (then delete it) under Myisha's host_id with no `inviter_id` and confirm the trigger fills it in.

Timestamp on completion: UTC time in the summary, as always.

## No UI changes

This is a data + trigger fix only. No component or presentation code changes.
