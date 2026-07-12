Fix the committee RSVP totals so the top card and the guest list use the same meaning for RSVP counts.

Plan:
1. Update the personal RSVP totals to count people, not just RSVP rows, for "My in-person RSVPs" and "My RSVPs left".
   - In the current data, that changes the personal in-person count from 17 RSVP records to 25 in-person people.
   - Zoom remains separate and unlimited, currently 3 Zoom people.
   - Total yes RSVP people remains 28 across 20 responses.
2. Rename labels so the page no longer mixes meanings:
   - "My in-person RSVPs" -> "My in-person guests RSVP’d"
   - "My RSVPs left" -> "My in-person spots left"
   - Keep "My Guests Uploaded" as uploaded invitations, because that is not an RSVP count.
3. Keep the lower confirmation section explicit:
   - Show in-person people, Zoom people, and response count separately, matching the visible guest list.
4. Verify end-to-end on `/admin?view=committee` as the admin previewing committee view:
   - Confirm the route renders committee-only view.
   - Confirm the top card count matches the lower confirmation/person totals.
   - Read the database back for the same host identity to confirm the displayed numbers match the stored RSVP rows and party sizes.

Technical details:
- Change `getRsvpTotals` personal calculations in `src/lib/rsvp-totals.functions.ts` so `mine.confirmed` and `mine.virtual` sum `party_size` from the best yes RSVP per guest group instead of adding `1` per RSVP response.
- Update copy in `src/components/rsvp-totals-card.tsx` to distinguish people/spots from response records.