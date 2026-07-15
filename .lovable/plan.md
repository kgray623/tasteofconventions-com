I found the issue: at least one admin/committee usage table is still calculating “confirmed” as the number of RSVP rows, so Kari shows 25 even though the attending people total is 34 total / 30 in-person / 4 Zoom.

Plan:
1. Update the admin “Steering committee invitations & usage” page so each inviter’s used/remaining counts are based on total attending people from `party_size`, not the number of confirmed RSVP rows.
2. Rename/clarify labels where needed so “confirmed guests” means attending people, while response-row counts are only shown as “responses” when intentionally needed.
3. Keep the existing in-person vs Zoom separation: in-person attending people count against quota/remaining; Zoom attending people display separately and do not use seats.
4. Verify specifically for Kari Gray (`kgray`) that the route no longer shows 25 as her confirmed guest total; it should reflect attending people from her RSVP party sizes.
5. Verify on the exact admin/committee route after implementation and read the database totals back before calling it fixed.

No guest rows, RSVP rows, inviter ownership, names, phones, or submitted information will be changed.