## Problem

On the My RSVPs page, the "RSVP totals" card counts every `yes` RSVP — including virtual (Zoom) ones — against the requested seat quota. The building has finite in-person seats but virtual attendance is unlimited, so virtual RSVPs should NOT eat into "Still available" or "Mine left." That's why the user's personal numbers look wrong (e.g. 52 requested, only 32 left even though many of those yeses are virtual).

## Change

Update `src/components/rsvp-totals-card.tsx` so quota math only counts in-person yes RSVPs, and surface virtual yeses as a separate read-only stat.

1. When summing `confirmed` (event-wide and personal), only include rsvps where `status = 'yes'` AND `attendance_mode != 'zoom'` (treat null/missing attendance_mode as in-person, matching how the rest of the app reads it).
2. Track `virtual` counts in parallel — sum of `party_size` for `status = 'yes'` AND `attendance_mode = 'zoom'` — for both the event-wide block and (when shown) "My slot."
3. Rendering:
   - Keep the three existing tiles ("Seats requested", "RSVPs confirmed", "Still available") but have "RSVPs confirmed" and "Still available" reflect in-person only. Rename "RSVPs confirmed" → "In-person confirmed" and keep "Still available" as the in-person remainder. The progress bar uses the same in-person ratio.
   - Add a small line under the grid: "Virtual (Zoom): N — unlimited, doesn't use seats." Same treatment under "My slot" when personal totals are shown.
4. No DB or server-function changes; this is a pure presentation/aggregation fix in the existing client query.

## Out of scope

- The user mentioned "I have 57 under my guest list" — that's the invitations count, separate from the totals card. Not changing guest-list rendering in this pass; if the 57 vs 52 discrepancy is actually a bug, we'll handle it in a follow-up once the in-person fix lands and the numbers are easier to compare.
- No change to `rsvp.$token.tsx`, RSVP submission logic, or quota enforcement on the server (waitlist behavior already keys off in-person seat math via `attendance_mode`).
