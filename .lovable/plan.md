## RSVP section cleanup

In `src/components/invitation-page.tsx`, the RSVP section currently shows (for signed-in users):
1. An outline button "View / update my RSVP" → `/my-rsvp`
2. A tiny line "Signed in as phone-808...@tasteofconventions.local"
3. The main sunset button "Click here to RSVP" → `/rsvp`

### Changes

1. **Remove** the "Signed in as {user.email}" line entirely. The synthetic `phone-…@tasteofconventions.local` address is an internal auth implementation detail and should never be shown to users.
2. **Relabel** the existing outline button from "View / update my RSVP" to **"Click here to update my RSVP"** (only shown when signed in, links to `/my-rsvp`).
3. **Keep** the primary sunset button as **"Click here to RSVP"** (always shown, links to `/rsvp`).

Result: signed-in users see two stacked buttons — "Click here to update my RSVP" (outline) above "Click here to RSVP" (sunset). Signed-out users see only the "Click here to RSVP" button.

### Files touched
- `src/components/invitation-page.tsx` — edit `LoggedInRsvpCta` (lines 477–495).

No backend, route, or auth changes.