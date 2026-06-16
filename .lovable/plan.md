Current verified database totals:
- Guests uploaded: 94
- SMS sent: 85 in the database right now, not 86
- Confirmed in person: 37 people
- Confirmed on Zoom: 3 people
- Total confirmed: 40 people
- Declined: 10 people / 10 RSVP records
- RSVP records: 36 total records, but those represent 50 people because some RSVPs have party_size > 1
- Food preorder rows: 18
- Linked food orders: 15 order records / 27 meals
- Unlinked food orders: 3 order records / 3 meals
- Total meals ordered across all preorder rows: 30

Why the dashboard math is wrong:
- The displayed pending count of 58 is from 94 uploaded minus 36 RSVP records.
- That mixes units: 94 is people/guest rows, while 36 is response records.
- If pending is based on people, the current raw people math is 94 - 40 confirmed - 10 declined = 44 pending/waiting for response.
- Food orders showing 15 is only linked preorder rows, not meals and not all preorder rows.

Plan:
1. Update `src/lib/admin-audit.functions.ts` so totals clearly separate records from people:
   - `guests_uploaded`: invitation rows, currently 94.
   - `sms_sent`: invitations with `invite_sent_at`, currently 85 unless one missing row is corrected in data.
   - `confirmed_in_person_people`: 37.
   - `confirmed_zoom_people`: 3.
   - `confirmed_total_people`: 40.
   - `declined_people`: sum of declined RSVP `party_size`, currently 10.
   - `rsvp_records`: actual RSVP rows, currently 36.
   - `pending_people`: `guests_uploaded - confirmed_total_people - declined_people - waitlist_people - maybe_people`, currently 44.
2. Fix food math to report both order records and meal counts without hiding unlinked orders:
   - `food_order_records_all`: 18.
   - `food_order_records_linked`: 15.
   - `food_order_records_unlinked`: 3.
   - `meals_ordered_all`: 30.
   - `meals_ordered_linked`: 27.
   - `meals_ordered_unlinked`: 3.
3. Update the `/admin` Guests card labels so the units are impossible to confuse:
   - Guests uploaded
   - SMS sent
   - Confirmed in person
   - Confirmed on Zoom
   - Total confirmed
   - Declined
   - Pending
   - Food order records
   - Meals ordered
   - Unlinked meals shown in reconciliation, not silently omitted.
4. Update the reconciliation CSV so each invitation row shows RSVP status, party size, attendance mode, ordering_food, preorder selections, and preorder meal count; keep unlinked orders visible on the preorders page.
5. Verify after implementation with read-only database queries and the running admin page so the rendered dashboard matches the raw totals exactly.

Technical notes:
- No schema change is needed.
- No data will be inserted, deleted, or modified.
- I will not rename RSVP; the change is only to correct counting units and food-order totals.