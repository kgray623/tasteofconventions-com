# Record Jackie Williams — RSVP yes, party of 2, in person

Verified in the database at 2026-08-27 14:40 UTC: Jackie Williams (402-378-5424, invitation `32b351c2-6472-4300-a234-5a831f5f14af`) has an invitation but **no RSVP row at all**, so she currently counts as pending. There is only one Jackie Williams record — no duplicate to merge.

## Change to apply

- Add an RSVP for Jackie Williams: status `yes`, party size `2`, attendance mode `in_person`, responded now, with a note that it was recorded on her behalf by admin.
- Nothing existing is edited, deleted, or hidden. Her invitation row stays exactly as it is. No meal, payment, or texting data is touched.

## Verification before reporting done

- Read the RSVP row back from the database and show status / party size / attendance mode.
- Report the before/after in-person people counts (she adds 2 seats) with a UTC timestamp.
- Confirm she no longer appears in the pending list.

## Technical notes

- Single insert into `rsvps` keyed on `invitation_id` (one row per invitation), leaving `ordering_food` to its existing trigger-driven default.
- No code changes — this is a data correction only, so RSVP totals continue to come from `src/lib/rsvp-math.ts` unchanged.
