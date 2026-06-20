Fix the committee roster data and display so the page shows the right people and RSVP status.

1. Correct the roster data
- Remove the duplicate Melissa roster entry by consolidating the misspelled `Melissa Novotne` records into one correct committee member: `Melissa Novotny`.
- Preserve Melissa’s existing RSVP status, which is already recorded as `yes`.
- Replace the combined `Jay & Rhonda Wilcher` committee entry with separate people:
  - `Jay Wilcher`
  - `Rhonda Wilcher`
- Keep Rhonda’s existing phone/team roster record intact.
- Add/fix Jay as his own committee roster member instead of showing the combined household name.

2. Make the page harder to get wrong
- Update the committee-message roster logic so combined names like `Jay & Rhonda Wilcher` do not appear as one committee person when separate roster records exist.
- Improve de-duplication so small spelling differences like `Novotne` vs `Novotny` do not create duplicate visible people.
- Keep RSVP matching by phone first, then name, so Melissa still shows RSVP’d yes after the cleanup.

3. Verify the result
- Re-check the committee-message page roster after changes.
- Confirm there is only one Melissa Novotny.
- Confirm Jay Wilcher and Rhonda Wilcher appear as separate rows.
- Confirm Melissa’s status shows RSVP’d yes.