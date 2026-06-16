I verified the rows directly in the database and the current dashboard code. The fix should not use assumptions.

Observed exact data right now:
- Guests uploaded: 94
- SMS sent: 85
- Confirmed in person: 37
- Confirmed on Zoom: 3
- Total confirmed: 40
- Declined: 10
- Pending: 44
- RSVP records: 36
- Cuisine preorder rows: 18
- Total meal quantities across every preorder selection line: 30
- Cuisine totals: African 8, Indonesian 12, Myanmar 10
- The 3 “unlinked” food orders match existing guests by phone:
  - Kenda Andersen → Kenda Andersen
  - MsDixie Frahm → MsDixie L. Frahm
  - S. Carmen De La Cruz → S. Carmen De La Cruz
- Duplicate flag table currently has 5 flag rows, but 3 duplicate pairs. Sofia/NE Sofia Barios exists as 2 uploaded rows, flagged by both name and phone. If the expected “four duplicates” means four uploaded copies of Sofia, only 2 are currently present in the database.

Plan:
1. Link the 3 matched food preorder rows to their invitation records.
   - This removes the false “unlinked food orders” warning for Kenda, MsDixie, and Carmen.
   - No guests or food rows will be deleted.

2. Fix the admin dashboard labels and remove confusing split counts.
   - Keep the guest card focused on guest math:
     - Guests uploaded: 94
     - SMS sent: 85
     - Confirmed in person: 37
     - Confirmed on Zoom: 3
     - Total confirmed: 40
     - Declined: 10
     - Pending: 44
   - Remove “(people)” from the labels.
   - Remove “food order records linked/unlinked” and “meals ordered linked/unlinked” from the main dashboard.
   - Show food as meal quantities, not preorder-row counts:
     - Meals ordered: 30
     - African: 8
     - Indonesian: 12
     - Myanmar: 10
   - If a row contains qty 3, it counts as 3 meals.

3. Clean up the reconciliation card.
   - Do not repeat RSVP records twice.
   - Hide orphan RSVP count when it is zero.
   - Hide unlinked food orders when zero after linking.
   - Show duplicates as “Duplicate guest pairs” instead of raw duplicate flag rows, so name+phone flags for the same two people do not look like separate duplicate people.
   - Also show the raw flag count only if needed for troubleshooting, not as a headline number.

4. Fix the preorder report page to include all matched orders in restaurant totals.
   - After linking, the report should count all 30 meals in the restaurant total.
   - Keep each selected cuisine as a separate row, with its quantity shown and summed.
   - Remove the “not counted” unlinked warning once there are no unlinked rows.

5. Update the reconciliation CSV.
   - Include every guest with RSVP status, party size, attendance mode, ordering food, preorder selections, and total meal quantity.
   - Include cuisine totals separately so exported food math can be checked line-by-line.

Validation after implementation:
- Re-query the database after linking to confirm unlinked preorder rows are 0.
- Re-query meal totals to confirm African 8 + Indonesian 12 + Myanmar 10 = 30.
- Verify the admin dashboard no longer shows conflicting linked/unlinked food metrics.
- Verify the preorder report restaurant total is 30 and matches the database query.