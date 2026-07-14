UTC 2026-07-14 — Plan to fix RSVP math consistency

I will make the app use one authoritative RSVP math rule everywhere, instead of each screen calculating totals differently.

What I will change:

1. Centralize the RSVP math
- Create one shared helper for RSVP totals.
- Use the same status rules everywhere:
  - Confirmed in-person = `status = yes` and not Zoom, summed by `party_size`.
  - Confirmed Zoom = `status = yes` and Zoom, summed by `party_size`.
  - Total confirmed = in-person people + Zoom people.
  - Pending = uploaded guests with no RSVP status, counted as guest records/responses, not party-size people.
  - Declined / waitlist / maybe will be counted consistently and labeled clearly.
  - Zoom never reduces in-person seat availability.
  - Seats available = total seats minus confirmed in-person people only.

2. Fix the committee view numbers
- Fix the “RSVP in person”, “RSVP by Zoom”, “Decline”, and “Pending” section headers so they don’t silently mix guest-record counts with party-size people counts.
- Show both when needed, for example: `RSVP in person (75 people / 46 responses)`.
- Make “My RSVP confirmations”, “new guests RSVP’d”, “My RSVP totals”, and “My Guests Uploaded” use the same rules.

3. Fix admin overview / guest roster / upload page consistency
- Update admin dashboard totals, guest roster filter totals, RSVP totals card, and upload page summary cards to match the same helper.
- Remove formulas like `uploaded - confirmed people - declined people` for pending, because that creates bad math when party sizes are greater than 1.

4. Preserve existing behavior
- No submitted guests, RSVPs, invitations, quotas, or uploaded information will be deleted, hidden, renamed, or overwritten.
- This is a calculation/display fix only unless I find an actual corrupted RSVP row; if I do, I will report it before changing data.

5. Verification before I call it fixed
- Read the database counts directly.
- Open the admin dashboard, committee preview, guest roster, and upload/guest-list route.
- Verify on the mobile viewport you are using that the displayed numbers match the database and match each other.
- Specifically verify in-person seats, Zoom totals, pending totals, declined totals, and response-vs-people labels.