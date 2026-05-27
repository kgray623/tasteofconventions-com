I’ll update the Step Two RSVP section so the visible order is:

1. `Click here to RSVP`
2. `Click here to update my RSVP`

Technical details:
- In `src/components/invitation-page.tsx`, move `<LoggedInRsvpCta />` so it renders after the `/rsvp` button instead of before it.
- Adjust the spacing wrapper on the update button so it has top spacing under the first button, not bottom spacing above it.
- No backend, RSVP logic, database, or route changes.