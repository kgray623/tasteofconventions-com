## Make the RSVP Totals card match the Confirmed RSVPs list (dedupe duplicates everywhere)

The mismatch (45 at top, 43 at bottom) is real and explainable: the top "RSVP totals" card and the bottom "Confirmed RSVPs" list compute confirmed people two different ways.

- **Bottom (Confirmed RSVPs, in `src/routes/_authenticated/admin/upload.tsx`)** — groups guests by duplicate (same normalized name, email, or last‑10 phone digits) and counts each group once, using the strongest RSVP/party size in the group. This is the behavior you asked for so Monahan/Monaghan-style pairs don't double-count.
- **Top (RSVP Totals card, via `getRsvpTotals` in `src/lib/rsvp-totals.functions.ts`)** — sums `party_size` across every `rsvps.status = 'yes'` row, no dedup. So any duplicate invitation that confirmed under both spellings inflates the count.

### Fix

Update `getRsvpTotals` to apply the exact same duplicate-grouping rules used in `upload.tsx`, then derive both `event.confirmed`, `event.virtual`, and the personal `mine.confirmed`/`mine.virtual` from the deduped per-group "best" RSVP.

Specifically, inside the server function:

1. Pull invitations (id, host_id, guest_name, guest_email_normalized, guest_phone_normalized) alongside their joined `rsvps` (status, party_size, attendance_mode). Existing rsvp query already returns invitation_id, so we'll add an invitations query keyed by event/active context.
2. Build groups by union over: normalized name (`lower`, strip non-letters), email_normalized, last 10 digits of phone_normalized — matching the client logic in `duplicateGroups`.
3. For each group, pick the "best" RSVP (rank yes > waitlist > maybe > no; tie-break on larger party_size). Sum party_size of those best picks where status = 'yes', split by attendance_mode for `confirmed` vs `virtual`.
4. For `mine.confirmed` / `mine.virtual`: same logic, but restrict groups to those whose representative invitation belongs to the user's host ids (existing `myInviteIds` set, but applied at the group level so a duplicate pair half-owned by the user still counts once and is attributed if any member is theirs).

### Files touched

- `src/lib/rsvp-totals.functions.ts` — add the grouping + best-RSVP logic; replace the current `confirmed`/`virtual` sums.

No DB changes, no UI changes, no changes to the upload page logic. After this, the top card and the bottom list will always agree.
