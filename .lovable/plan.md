Regenerate `lovable-migration-guide.pdf` as a new version (`lovable-migration-guide_v2.pdf`) with a fully rewritten "What this app is" / overview section per your corrections. All tech-stack / migration steps stay as-is.

## Corrections to apply to the overview

**What the app is**
- SMS-based invitation and RSVP web app for "A Taste of Special Conventions" (Sunday, August 30, 2026).
- Admin invites selected RSVP guests to become committee members. Committee members then invite guests by SMS from their own phones (the platform never sends texts itself; each inviter uses their own device via prefilled `sms:` links).
- No guest email is ever collected. Phone/SMS only.

**Login**
- Mobile phone + name (as it appears on the invitation). No password field, no one-time password.
- Works on mobile and web.

**Three access types**
- Admin
- Committee
- Guest

**RSVP + inviter model**
- Each guest chooses (or is tied to) an inviter (committee member).
- RSVPs are first come, first served, connected to the inviter chosen by the guest.
- No per-inviter quota.

**Primary purpose — fill the venue (must be prominent)**
- Event center capacity: **550 seats total**.
- Currently 400+ seats still open; the whole point of the platform is to fill the venue.
- The platform tracks:
  - Number of guests invited
  - Number of RSVPs received
  - Total RSVP head-count per inviter (party sizes)
  - In-person building attendance (counts against the 550 cap)
  - Zoom attendance (unlimited — no cap concern)
  - Meal pre-orders across three restaurant/cuisine options (catered), per guest
- Waitlist logic exists but is not relevant yet — only triggers if in-person attendance reaches 550. Inviter quotas never trigger waitlist.

**Guest experience goals**
- Seamless: guest picks attendance mode (in person or Zoom) and optionally pre-orders a catered meal from one of the three cuisines.
- Inviter can see their own guest list, RSVP status, and meal choices.

## Deliverable
- New file: `/mnt/documents/lovable-migration-guide_v2.pdf`
- Original `lovable-migration-guide.pdf` left untouched.
- Rebuild using the `pdf` skill; run visual QA (render each page to image, inspect for overflow / clipped text / layout issues) before delivery.
- Reply with a `<presentation-artifact>` tag for the v2 PDF and a short note listing what changed vs v1.

Confirm and I'll build v2.
