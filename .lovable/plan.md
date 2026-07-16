Regenerate the migration guide as `lovable-migration-guide_v3.pdf` with the corrections below. v1 and v2 are left untouched.

## Corrections to apply

**Login (was wrong in v1 and v2 — fix definitively)**
- There IS a password. The **password is the individual's mobile phone number**.
- The **username is the last name** (as it appears on the invitation).
- There is **no one-time password (OTP)**.
- Works on mobile and desktop web.
- Each login is tied to a phone number, and the phone number determines which of the three dashboards the user sees.

**Three login / access types (each tied to a phone number)**
- **Admin** — sees the admin dashboard.
- **Committee** — sees the committee dashboard (their own guest list, RSVPs, meal choices).
- **Guest** — sees the guest dashboard (their own RSVP, attendance mode, meal choice).

**Invitation hierarchy (rewrite this section)**
1. Admin invites guests.
2. Guests RSVP.
3. Admin can promote any RSVP guest into a committee member.
4. Once someone is a committee member, they can invite more guests (by SMS from their own phone).
5. Those new guests can also opt to become committee members — the admin makes the connection.

**Venue / tracking (keep the v2 callout, refine wording)**
- 550-seat in-person cap; 400+ seats still open.
- Track: uploaded/invited guests, RSVP confirmations, **party size per RSVP — one RSVP with 5 people counts as 5, not 1** (call this out explicitly).
- Zoom attendance is unlimited.
- Three cuisine / restaurant meal options, tracked per guest and per meal chosen.
- Waitlist logic only triggers when in-person attendance reaches 550. Inviter quotas never trigger waitlist.

**Day-one AI prompt in Step 5** — update the domain rules block to match:
- Login = phone number (password) + last name (username); no OTP.
- Hierarchy: admin → guest → RSVP → (admin promotes) → committee → invites more guests → ...
- Party size counts as people, not as 1 RSVP.
- Three roles: admin, committee, guest — dashboard chosen by the phone number's role.

## Deliverable
- New file: `/mnt/documents/lovable-migration-guide_v3.pdf`.
- Original `lovable-migration-guide.pdf` and `lovable-migration-guide_v2.pdf` left in place.
- Rebuild with the PDF skill; render each page to an image and visually QA (no overflow, no clipped text, callouts still readable) before delivering.
- Reply with a `<presentation-artifact>` tag for v3 and a short bullet list of what changed vs v2.
