## What's missing

On `/admin/upload`, the "Confirmed RSVPs" card lists each attendee with a "{n} attending" gold badge, but it never says whether the guest is coming in person or joining over Zoom. The data exists (`rsvps.attendance_mode` is `"in_person"` or `"zoom"`) — the upload page just isn't selecting or displaying it.

## Changes (UI only, single file: `src/routes/_authenticated/admin/upload.tsx`)

1. **Pull `attendance_mode` from the database**
   - In `loadSavedGuests`, change the rsvps select to `rsvps(status,party_size,attendance_mode)`.
   - Extend the `Row` and `savedGuests` types with `attendance_mode: "in_person" | "zoom" | null`.
   - Map it through so each saved guest carries its mode (default `"in_person"` when missing).

2. **Show the mode on every confirmed RSVP row**
   - Next to the existing "{party_size} attending" gold badge, add a second badge:
     - In person → neutral/outline badge "In person"
     - Zoom → terracotta badge "Zoom"
   - Keep the rest of the row layout (name, phone, "Invited by …") unchanged.

3. **Split the summary count in the card header**
   - Replace `Confirmed RSVPs ({confirmedPeople} people / {confirmedGuests.length} responses)` with a clearer breakdown:
     - `Confirmed RSVPs — {inPersonPeople} in person · {zoomPeople} on Zoom ({confirmedGuests.length} responses)`
   - Compute `inPersonPeople` / `zoomPeople` from `confirmedGuests` by summing `party_size` per `attendance_mode`.

4. **(Optional, low-risk) Group the list**
   - Render in-person attendees first, then a thin divider labeled "Joining on Zoom", then Zoom attendees. Same row markup either way. If you'd rather keep one flat list with just the badge, say so and I'll skip the divider.

## Out of scope

- No changes to RSVP capture, business logic, totals/quotas, or any other admin page (the event-detail admin page already shows the mode).
- No schema or RLS changes.
