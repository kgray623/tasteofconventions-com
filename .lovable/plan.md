## Fix "RSVPs available" math on the Committee RSVP totals card

**Problem:** Card shows 550 seats / 300 requests / 260 available / 40 confirmed. "Available" is currently computed as `requests − confirmed`, which is confusing — it should reflect how many seats out of the 550 total are still unallocated to a committee member's RSVP request.

**Change:** Recompute the event-level "RSVPs available" as `TOTAL_SEATS − requested` (clamped to ≥ 0). With current data: 550 − 300 = **250**.

### Files
- `src/components/rsvp-totals-card.tsx` — change one line:
  - `const available = Math.max(0, event.requested - event.confirmed);`
  - → `const available = Math.max(0, TOTAL_SEATS - event.requested);`

### Out of scope (unchanged)
- Total seats (550), RSVP requests, In-person confirmed tiles.
- Progress bar % (still confirmed / requested).
- "My RSVPs left" personal tile (still my-requested − my-confirmed — that's the right meaning for a personal quota).
- Zoom totals and request-more flow.
