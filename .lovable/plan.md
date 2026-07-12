Timestamp (UTC): 2026-07-12

Plan to correct the RSVP math and wording:

1. Separate the three different numbers everywhere they appear
   - Total seats: always 550.
   - Confirmed in-person RSVPs: count only `status = yes` and `attendance_mode != zoom`, summed by party size.
   - Requested RSVPs: keep as quota/allocation requests from committee members; do not use this for capacity percentage.

2. Fix the capacity percentage
   - Capacity percent = confirmed in-person seats / 550.
   - With the current database read-back showing 73 in-person confirmed seats, that should display about 13% filled, not 28%.
   - Zoom RSVPs stay visible separately and do not reduce seat capacity.

3. Fix misleading labels on the RSVP cards
   - Rename any confusing “Current RSVPs”/“Total RSVPs” language where needed so it is clear what is seats, confirmed in-person RSVPs, requested RSVP quota, and available seats.
   - Keep “Requested RSVPs” as its own quota/allocation number, not as actual RSVPs.

4. Fix all affected screens consistently
   - Update the shared RSVP totals card used on admin/committee pages.
   - Update the admin upload totals area, which currently counts all `yes` RSVPs and can include Zooms in the seat math.
   - Leave database rows untouched.

5. Verify before reporting back
   - Read the database counts again after the change.
   - Open the exact admin/committee route on the current mobile viewport.
   - Confirm the UI shows 550 seats, 73 confirmed in-person seats if that remains the live count, and approximately 13% filled.
   - Confirm requested RSVP quota remains shown separately and is not used as capacity.