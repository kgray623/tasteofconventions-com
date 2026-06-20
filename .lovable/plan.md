I found the committee dashboard issue: the main “My Guests Uploaded” source is still sorted by RSVP status first, and the Confirmed RSVPs section maps an unsorted confirmed list. I will standardize every visible guest/name list on the committee dashboard to alphabetical order.

Plan:
1. In `src/components/committee-workspace.tsx`, add one shared alphabetical comparator for guest names using case-insensitive `localeCompare`.
2. Change “My Guests Uploaded” so the base list is alphabetical by guest name, not status-ranked.
3. Keep the three RSVP groups organized, but sort every group alphabetically:
   - RSVP’d
   - Awaiting RSVP / waitlist
   - Declined
4. Change the “Confirmed RSVPs” section to render an alphabetized confirmed list instead of raw database order.
5. Keep the full “Guest list” alphabetized using the same comparator.
6. Verify there are no remaining committee dashboard guest/name lists using created-date or status-first ordering.