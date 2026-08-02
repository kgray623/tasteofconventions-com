## Goal

1. Every committee member (and admin) can see, on their own dashboard, which of the names they submitted are **duplicates already credited to another referrer** — so nobody thinks a name was dropped.
2. Produce a line-by-line accounting for Tina Santana's **second list image**, matching the same keep/move/add ledger format as her first list.

## Part 1 — New "Duplicate" category on the committee dashboard

Today the dashboard only flags duplicates *inside* a single person's own list (same name/phone twice). It has no way to show "you submitted this person, but they were already on someone else's list" — that name simply disappears from the submitter's view, which is what caused the confusion.

Fix in two pieces:

**A. Record the overlap (currently nowhere in the database).**
New table `referral_duplicates`:
- `claimed_by_inviter_id` — the committee member who submitted the name later
- `invitation_id` — the existing guest record
- `owner_inviter_id` — the first-loaded owner who keeps the credit
- `source_note` — e.g. "Tina list image 2, 2026-08-02"
- standard timestamps, RLS so a committee member reads only rows where they are the claimer or owner, admins read all

Backfill it with every overlap already identified in Tina's lists (the 6–7 households retained with Gray, Monaghan, Moore, Diaz, Cole, Bey, Hopkins) plus any found in her second image.

**B. Show it.**
On `committee-workspace.tsx`, add a collapsible group **"Duplicates — credited to someone else"** alongside the existing groups, listing each name with:
- guest name + phone
- an amber `Duplicate` badge (distinct from the existing red in-list `Duplicate` badge)
- "Already credited to **{owner name}** — first loaded {date}"
- RSVP status if any, read-only (no text/mark-sent actions, since they aren't this person's to text)

Counts stay honest: these rows are **not** added to the member's own referral totals; the group header shows its own count, e.g. "Duplicates — credited to someone else (6)". Admin view at `/admin/inviters` gets the same group per committee member.

## Part 2 — Accounting for Tina's second list image

Method (no guessing):
1. Re-read the second image from this conversation and transcribe every line verbatim into a ledger (name as written, phone as written).
2. Match each line against live `invitations` by last-10-digit phone first, then normalized name.
3. Classify each into exactly one bucket:
   - **Already Tina's** — `inviter_id` = Tina, no change
   - **Newly credited to Tina** — existed with no referral owner → credit Tina
   - **Duplicate, stays with earlier owner** — First-Loaded Wins → record in `referral_duplicates` so it shows on Tina's dashboard
   - **New — added** — not in the system → create under Tina
   - **Unreadable / needs confirmation** — listed back to you rather than guessed
4. Apply the changes, then read back from the database and report totals: `X already hers + Y newly credited + Z added = her new owned count`, plus `D duplicates visible but credited elsewhere`.
5. Verify on Tina's actual mobile committee dashboard that the owned count and the new Duplicates group both render correctly.

If any line in the second image is not legible enough to match with certainty, it will be reported to you for confirmation instead of being invented.

## Technical notes

- One migration: create `referral_duplicates` with GRANTs, RLS, and owner/claimer read policies; no changes to existing referral triggers (the First-Loaded-Wins guard in `link_invitation_inviter_from_rsvp` stays as-is).
- Frontend changes limited to `src/components/committee-workspace.tsx` and the admin committee-guests route; existing in-list duplicate detection is untouched.
- No guest record is deleted, renamed, or hidden at any point.
