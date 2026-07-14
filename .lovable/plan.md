## Guest Search Feature

Add a sticky search bar to `/admin/upload` that lets a committee member look up any guest across the entire event by name, phone, or inviter — and see their RSVP status at a glance.

### UX
- Sticky header bar at the top of the Upload Guests page (below the existing page header), visible while scrolling.
- Single text input with placeholder "Search guests by name, phone, or committee member".
- As the user types (debounced ~200ms, min 2 chars), a results dropdown/panel opens showing matches.
- Each result row shows:
  - Guest name + phone
  - RSVP status badge: **Not confirmed** (gray), **Confirmed – In person** (green), **Confirmed – Virtual** (blue), **Declined** (red), **Waitlist** (amber)
  - Added by: committee member name
- Empty state: "No guests match '<query>'".
- Clicking outside or pressing Esc closes the panel.

### Data
- New server function `searchGuests({ q })` in `src/lib/rsvp-totals.functions.ts` (or a new `guest-search.functions.ts`):
  - Uses `requireSupabaseAuth` (any signed-in committee/admin user).
  - Queries `invitations` joined with `inviters` (for committee member name) and latest `rsvps` row (for status).
  - Matches `ilike` on guest first/last name, phone (digits-only compare), and inviter name.
  - Returns top 25 results ordered by name.

### Placement details
- Wrap the sticky bar inside the existing page container in `src/routes/_authenticated/admin/upload.tsx` with `sticky top-0 z-40 bg-background border-b`.
- Does not replace or move any existing sections (My RSVPs, guest list, totals remain unchanged).

### Verification
- Playwright at `/admin/upload?view=committee` at 1070×639: type a partial name → confirm matching guests appear with correct status + inviter; type a phone fragment → same; type a committee member's name → their guests appear.
- DB read-back to confirm status shown matches `rsvps` table.
