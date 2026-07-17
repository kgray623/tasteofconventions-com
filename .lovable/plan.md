2026-07-17 21:12 UTC — I checked the live database and the relevant code paths before proposing this.

Current verified database counts:
- Confirmed RSVP rows: 65
- Confirmed people by party size, all modes: 98
- Confirmed in-person RSVP rows: 54
- Confirmed in-person people by party size: 87
- Confirmed Zoom RSVP rows: 11
- Declined RSVP rows: 30
- Pending/no RSVP rows: 157
- Total invitation rows: 252

Why the screens disagree:
- One screen is showing confirmed RSVP rows/responses: 65.
- Another screen is likely showing people/party-size seats, and/or a deduplicated/subset count: the database has 87 in-person confirmed people and 98 confirmed people across in-person + Zoom.
- The admin guests screen already labels big number = guests/RSVPs and small number = people by party size, but the event totals card uses only in-person people as “confirmed,” which makes it easy to compare unlike numbers.

Plan to fix it:
1. Create one shared RSVP totals shape for every screen: responses, people, in-person people, Zoom people, declined, pending, and total uploaded.
2. Update the event/committee totals card so labels are explicit:
   - “In-person confirmed people”
   - “Confirmed RSVPs”
   - “Zoom confirmed people”
   - “Seats available” based only on in-person confirmed people.
3. Update dashboard/committee summary widgets that currently count confirmed by `.length` so they use the same shared rollup and do not mix RSVP rows with party-size people.
4. Update the admin guests status screen wording so the number pair is consistent everywhere: primary = RSVP/guest records, parenthetical = people by party size, with in-person/Zoom split shown where relevant.
5. Add a small admin reconciliation line showing the exact live totals so staff can tell immediately what each number means.
6. Verify end-to-end on the admin guests route and committee/admin dashboard route with database read-back and mobile viewport screenshots before calling it fixed.