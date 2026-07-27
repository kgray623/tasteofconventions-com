## What the database actually shows for Tina Santana (verified 2026-07-27 UTC)

Her 35 uploaded contacts break down exactly like this:

| Group | Families | People |
|---|---|---|
| Confirmed in person | 7 | 12 |
| Confirmed Zoom | 1 | 1 |
| Declined | 2 | 2 |
| **No RSVP submitted at all** | **25** | **25 (counted as 1 each until they reply)** |
| Total | 35 | — |

So nothing is missing or hidden. The numbers she is seeing (7 families / 12 people confirmed, 2 declined, 1 Zoom) are correct, and **the "rest" are 25 people who have simply never submitted an RSVP**.

One more fact from the data: of those 35, **29 are marked as invitation sent and 6 have never been marked as sent** — meaning 6 of her contacts may not have been texted their invite link yet.

## The real gap

Her workspace does have an "Awaiting reply" group, but it's collapsed by default and doesn't call out how many people are still outstanding or which ones were never texted. That's why it reads as "where did they go?" rather than "25 haven't answered yet."

## Proposed changes (committee workspace, Tina's view and every other committee member's)

1. **Always-visible awaiting summary line** at the top of "My guests": `35 contacts • 8 replied • 25 awaiting reply • 2 declined`, so the math reconciles at a glance with no expanding needed.
2. **Open the "Awaiting reply" group by default** when there are outstanding guests, instead of collapsed.
3. **"Not texted yet" flag** — inside the awaiting list, badge the contacts with no sent date (6 for Tina) and sort them first, with the existing one-tap SMS invite link and "Mark as sent" button right there.
4. **"Send reminder" SMS link** on every awaiting guest who was already texted, pre-filled with a short reminder plus their RSVP link (still sent from her own phone; the system never texts anyone).
5. No counting logic changes — the people-first totals stay exactly as they are.

## Technical notes

- Source of truth is `getCommitteeWorkspaceGuests` in `src/lib/rsvp-totals.functions.ts` (already matches on both `host_id` and `inviter_id`, which is why Tina's 35 are complete).
- UI work is in `src/components/committee-workspace.tsx`: the `openMyGroup` default state, the "My guests" header summary, and the awaiting-group row rendering (`invite_sent_at` is already returned per guest).
- No migration required; no RSVP data will be changed.

## Verification before I call it done

Sign in as Tina (last name + phone) on a mobile viewport, open her committee workspace, and confirm the header reads 35 contacts with 25 awaiting, the awaiting group is expanded, 6 rows carry the "not texted yet" badge, and the totals still match a direct database read.
