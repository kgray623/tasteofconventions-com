2026-07-12 22:21:21 UTC

Plan to fix the RSVP quota/remaining math only

1. Correct the remaining formula everywhere this committee quota appears
- Remaining must be based on the approved/requested RSVP quota, not uploaded guests.
- Formula for committee quota views:
  ```text
  Remaining = RSVP requests/quota - in-person confirmed RSVPs
  ```
- For Betsaida Ruiz, this means:
  ```text
  30 requested - 7 in-person confirmations = 23 remaining
  ```
- Uploaded guests stays a separate number and will not reduce remaining by itself.

2. Update the admin committee usage table
- In `/admin/inviters`, change Remaining from the current incorrect calculation:
  ```text
  uploaded guests - in-person confirmed
  ```
- To the correct quota calculation:
  ```text
  inviter quota - in-person confirmed
  ```
- Keep Uploaded visible as its own column so admins can still see how many guest records were added.
- Keep Zoom/virtual RSVPs separate and unlimited; Zoom does not reduce remaining.

3. Align the committee/member RSVP summary cards with the same meaning
- Ensure “My RSVPs left” and any “remaining of requested” display use the same baseline: approved requested RSVP quota.
- Do not use uploaded guests as the baseline for remaining.
- Do not count declined, pending, Zoom, or not-yet-sent guests against remaining.

4. Verify directly against the database before saying it is fixed
- Read back Betsaida Ruiz’s row and confirm these source values:
  - quota/requested = 30
  - uploaded = 21
  - in-person confirmations = 7
  - remaining = 23
- Open the exact admin route `/admin/inviters` and verify the row renders those numbers.
- Open the committee-facing route/card at the current viewport and verify the same remaining logic appears there.
- I will not call it fixed unless the database read-back and rendered UI both match.