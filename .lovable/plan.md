## Sort the My Guests list + flag duplicates inline

In `src/components/committee-workspace.tsx`:

### 1. Sort order (replace the current created_at order on render)
Apply this comparator to `myGuests` before rendering:
1. **Status bucket** — Pending (no RSVP) → Confirmed (`yes`) → Declined (`no`) → anything else.
2. Within each bucket, **alphabetical by `guest_name`** (case-insensitive, trimmed).

### 2. Duplicate flag inline
Build a `duplicateIds: Set<string>` from `myGuests`:
- Normalize name = lowercase + strip non-letters.
- Normalize phone = last 10 digits.
- For any guest whose normalized name matches another guest's, OR whose last-10 phone matches another's, add both ids.

Next to the guest name, render a small red pill **"Duplicate"** (with `AlertTriangle` icon) when `duplicateIds.has(guest.id)`. Same look as our other red badge — `bg-brand-red text-white text-[10px] uppercase px-2 py-0.5 rounded-full`.

### Files
- **Edit** `src/components/committee-workspace.tsx` — add the comparator + the duplicate set + the badge next to the guest name in the existing `myGuests.map(...)` row.

### Not changing
- Data fetching / server logic (sorting + dup detection are client-side over the already-loaded list).
- Any other section of the workspace.
- The Welcome video, the bell, etc.
