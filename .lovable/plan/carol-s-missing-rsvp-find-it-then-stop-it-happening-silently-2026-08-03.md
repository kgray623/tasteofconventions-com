# Carol's missing RSVP — find it, then stop it happening silently

2026-08-03 14:25 UTC

## What the database actually shows

- Tina Santana's Carol is **Carol Torres, 773-750-7270**, loaded 2026-07-11, credited to Tina.
- There is **no RSVP row of any kind** for her — not "yes", not "no", nothing. That is why the app shows Pending. Nothing was deleted: there is no archived row, no pre-order, and no audit entry for her.
- Other Carols in the system (Carol Humphrey / Dixie, Carol Getzman / Kari, Carole Fuscone / Dixie, "Carol, Andy Fisher" / Mysha) are different people, so her reply did not land on the wrong record either.

So Carol's submission never reached the database. RSVPs generally are working (several saved today), so this is a submission that was rejected or abandoned, not a system-wide outage.

## The most likely reason (confirmed in code, not yet proven for Carol)

Every RSVP submit is blocked unless the "Invited by" name is an **exact** match to a roster name. If Carol typed "Tina", "Tina S", or "Santana" instead of the exact "Tina Santana", the save was refused and nothing was stored. Today there is no record of these refusals, so a guest can believe they RSVP'd while the app has nothing.

I have not proven this is what happened to Carol, because failed attempts are not logged anywhere. Step 1 below fixes that blind spot.

## Plan

1. **Log every rejected RSVP attempt** (name, phone, chosen status, reason, time) so a guest saying "I RSVP'd" can always be checked instead of guessed at.
2. **Make the referrer field forgiving instead of a wall**: accept close matches (first name only, extra/missing last name, spelling slips) and resolve them to the real committee member. If it is genuinely ambiguous, still save the RSVP and flag it for admin review rather than throwing the whole reply away.
3. **Never lose a reply again**: if the referrer cannot be resolved, the RSVP is still recorded with the guest's typed text kept verbatim, shown in the admin list as "needs referrer confirmation".
4. **Admin "unmatched / rejected replies" panel** under Admin so you can see, in one place, anyone whose reply didn't stick and fix it with one tap.
5. **Carol specifically**: I need her actual answer before writing it in — I will not invent it.

## What I need from you

Carol's reply details: attending yes/no, in-person or Zoom, and how many people. I will record it under Carol Torres, credited to Tina Santana, and read it back from the database plus the committee dashboard to prove it shows.

## Technical notes

- `assertInvitedByIsCommittee` in `src/lib/invitations.functions.ts` throws on any non-exact roster match, before the `rsvps` upsert — the reject point.
- Replace the exact-set check with the existing fuzzy resolver used by referral reconciliation (`public.resolve_referral_inviter_id` / dice-coefficient matching in `src/lib/rsvp-math.ts`) and downgrade failure from throw to flag.
- Add a `rsvp_submission_failures` insert (or `audit_log` row with `success = false`) in the catch path of `submitRsvp`.
- Admin panel: new section on `/admin/guests` (or a small route under `_authenticated/admin`) reading the failure log plus RSVPs with unresolved referrer text.
