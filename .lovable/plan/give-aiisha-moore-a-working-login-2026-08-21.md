# Give Aiisha Moore a working login

2026-08-21 13:47 UTC

## What the screenshot gives us

The contact card supplies the phone number that was missing from the earlier flag:
**NE Aiisha Moore — (308) 627-2449**.

Verified in the database just now:

- `inviters` row `b61b6839…` — name "Aisha Moore", active, quota 1, `phone` null, `email` null, `host_id` null.
- No `invitations`, `team_invites`, or `cuisine_preorders` row anywhere with digits `3086272449`.

So today she cannot log in: sign-in matches last name + phone against invitations / inviters /
team_invites, and she has no phone on any of them.

## What will change

1. Set `inviters.phone = '(308) 627-2449'` on her existing row. Nothing is replaced or deleted —
   only the null phone is filled.
2. Add a committee `team_invites` row (name "Aiisha Moore", phone (308) 627-2449, role `team`) so the
   first sign-in grants her committee access and links `host_id` automatically.
3. Correct the stored name to the spelling on her contact card, **Aiisha Moore** (currently "Aisha
   Moore"). Her guests stay attached because they join on the inviter id, not the name. Say the word
   and I will leave the old spelling instead.

## Verification before I call it done

- Read back her `inviters` row and the new `team_invites` row and show you the actual values.
- Run the same lookup the login uses against last name "Moore" + 3086272449 and confirm it resolves to
  her inviter row and to a committee role.
- Confirm her existing referral/guest counts are unchanged before and after (should be 0 guests today —
  I will report the exact number).

## Technical notes

- Data-only change: one `UPDATE public.inviters` and one `INSERT INTO public.team_invites`.
- No code, RSVP, meal, payment, or referral changes.
- Her quota stays at 1 unless you want it raised.
