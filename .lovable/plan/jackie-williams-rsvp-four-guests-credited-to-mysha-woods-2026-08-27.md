# Jackie Williams RSVP + four guests credited to Mysha Woods

Verified in the database at 2026-08-27 14:43 UTC.

## What the records show now

| Guest | Phone | Credited to (inviter) | "Invited by" text | RSVP |
| --- | --- | --- | --- | --- |
| Jackie Williams | 402-378-5424 | Tina Santana | — | no RSVP row (counts as pending) |
| Latea Glenn | 402-686-5008 | Tina Santana | Mysha Woods | yes · 1 · in person |
| Margaret Gibson | 402-917-4152 | Tina Santana | Tina Santana | yes · 2 · in person |
| Brittany Avery | 402-676-1298 | Tina Santana | Mysha Woods | yes · 1 · Zoom |

Mysha Woods is an active inviter (quota 90). Brittany (Banks), 402-650-8983, is a different person under Shelley & Pat Monaghan and is left alone.

## Changes to apply

1. Add Jackie Williams' RSVP: yes, party of 2, in person, recorded on her behalf today.
2. Re-credit all four guests above to Mysha Woods (set their inviter, and set the "invited by" label to Mysha Woods so the card text matches the credit).
3. Nothing is deleted or hidden. Brittany Avery's Zoom attendance mode and everyone's party sizes stay exactly as they are; no meal, payment, or texting data is touched.

Note: these four were first loaded under Tina Santana, so this is an explicit override of the normal First-Loaded-Wins credit rule at your direction. Tina's referral total drops by these four and Mysha's rises.

## Verification before reporting done

- Read all four rows back from the database showing inviter name, invited-by, RSVP status, party size and mode.
- Report Mysha's and Tina's referral counts before and after, plus the in-person people total before and after Jackie's +2, with a UTC timestamp.
- Confirm Jackie Williams no longer shows as pending and now appears under Mysha on the committee roster.

## Technical notes

- One insert into `rsvps` for Jackie (one row per `invitation_id`), leaving `ordering_food` to its existing trigger default.
- Updates to `invitations.inviter_id` and `rsvps.invited_by` for the four guests; `referral_duplicates` visibility is left as-is so any existing overlap stays on record.
- No code changes — data corrections only, so totals continue to come from `src/lib/rsvp-math.ts` unchanged.
