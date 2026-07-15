On the `/admin` "My Guests" card, every count should be **people (seats in the building)** only — never a response count.

## Changes (single file: `src/components/committee-workspace.tsx`)

1. **Filter tabs** (All / Confirmed / Pending / Declined / Latest upload): show people count.
   - The last edit already switched these to `peopleCountFor(...)`. The screenshot shows the old "Confirmed (25)" — likely a stale PWA cache. I'll re-verify in the browser after the edit; if it's still 25 I'll bump a version marker on the section to bust the service worker cache for that route.
2. **Section headers inside the card** — replace `formatPeopleResponses(people, responses)` (which renders "35 people / 25 responses") with just the people number:
   - "Confirmed RSVPs (35)"
   - "RSVP in person (N)"
   - "RSVP by Zoom (N)"
   - "Pending (N)"
   - "Decline (N)"
   - Flat-view group header (Confirmed / Pending / Declined / All / Latest upload) — same: people only.
3. **"My Guests (91)" card title** — leave as-is (that's already row count = 91 uploaded guests, which matches "All (91)" tab; user has not complained about it, and it's the number of records they uploaded).
4. **"New guests RSVP'd" banner** — same rule: show just people count, drop the "(across N responses)" suffix.

Nothing else changes — no data fetching, RSVP logic, duplicate detection, or column changes. Response-count math stays in the code (used by other pages via `formatPeopleResponses`); this card just stops displaying it.

## Verification

After the edit, Playwright at 384×673 on `/admin` signed in as committee → screenshot the My Guests card and confirm:
- Confirmed tab shows 35 (not 25)
- "Confirmed RSVPs" header shows "(35)" only
- Pending header shows just a single number
- No "X / Y responses" text anywhere in the card

Timestamp: 2026-07-15 20:41 UTC.
