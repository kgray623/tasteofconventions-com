2026-07-20 23:15 UTC — I checked the live database and code path instead of guessing.

Confirmed current database facts:
- Abigail and DeShawn Bradley are saved as Yes / In-person / party size 6.
- The full event total is 111 in-person people and 13 Zoom people.
- Kari Gray’s dashboard is still showing 29 in-person and 4 Zoom because Abigail and DeShawn Bradley are currently linked to Tina Santana, not Kari Gray.
- There is also a separate Deshon Bradley record linked to Myisha Woods as Yes / In-person / party size 6.
- The committee RSVP totals card only loads once when it mounts, so it can stay stale after RSVP edits unless the page fully remounts.

Plan:
1. Correct the Bradley ownership data
   - Move the Abigail and DeShawn Bradley invitation to Kari Gray if that is the intended owner for your RSVP list.
   - Leave the separate Deshon Bradley/Myisha record untouched unless you explicitly want that merged later, because removing or merging submitted user information without instruction would violate your retention rule.

2. Fix the dashboard refresh behavior
   - Update the committee dashboard so the RSVP totals card can be force-refreshed after an RSVP save, delete, guest edit, or manual refresh.
   - Make the totals card re-query the backend whenever the guest list refreshes, instead of only loading once.

3. Keep one people-first counting path
   - Keep using the existing canonical RSVP math engine for all displayed counts.
   - Ensure the committee list summary and the RSVP totals card are both fed from freshly loaded data after changes.

4. Verify end-to-end before claiming it is fixed
   - Read the database back after the data correction.
   - Open the committee dashboard route at the mobile viewport shown in your screenshots.
   - Confirm Kari’s RSVP totals and the grouped list show the updated in-person people count including Abigail and DeShawn’s 6 seats.
   - Confirm the event-level building attendance still reads from party-size people, not contact rows.

After you approve, I’ll implement only this RSVP totals/data-link fix.