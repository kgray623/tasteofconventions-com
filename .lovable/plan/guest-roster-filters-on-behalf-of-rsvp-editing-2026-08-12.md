# Guest roster filters + on-behalf-of RSVP editing

2026-08-12 16:5x UTC

## What already exists (verified in the code)

- `/admin/guests` already has status tabs (All / Confirmed / Declined / Maybe / Waitlist / Pending) with people-by-party-size counts, and the reconciled line already prints in-person vs Zoom people.
- The page already accepts an attendance filter in the URL (`?mode=in_person` / `?mode=zoom`) and the filter logic is wired — but there is **no button or dropdown on screen to set it**, so today it is unreachable from the interface.
- There is **no edit control anywhere on the roster**. Guest name, phone, RSVP status, party size, and in-person/Zoom can only be changed by me through the database. That is why every correction so far has cost you credits.
- Committee members cannot open `/admin/guests` at all — it is admin-only in the navigation gate.

## What will be built

### 1. Visible attendance filter with live counts

Add an In-person / Zoom / All filter row directly under the status tabs, each showing its own people count for the currently selected status. Selecting one updates the URL so the view is shareable and survives refresh, and both the header summary and CSV export follow the filtered set exactly.

### 2. Inline "Edit RSVP" on every roster row

Each guest row gets an Edit button that opens a small mobile-sized sheet with:

- RSVP status: Yes / No / Maybe / Waitlist / No reply yet
- Party size (number of people)
- Attending: In person / Zoom
- Guest name and phone (correcting typos and duplicates)
- A short "why" note recorded with the change

Saving writes to the database, reads the row back, and only then updates the count on screen — so a number never changes unless the database actually changed. Nothing is ever deleted: the previous values are written to the audit trail with who changed them and when.

Guardrails kept intact: the existing meal-payment and meal-reduction protections still apply, so an RSVP edit can never silently wipe a paid meal order. If a guest has meals or payments attached and the edit would remove them, the sheet says so and asks for explicit confirmation instead of doing it quietly.

### 3. Committee access, scoped to their own guests

- **You (admin):** edit any guest on the roster.
- **Committee members:** get the roster screen with the same filters and the same Edit sheet, but limited to the guests brought in under their own name. They cannot see or edit anyone else's guests.
- Every committee edit is stamped with their name in the audit log, so on-behalf-of changes are always attributable.

Permission is enforced on the server, not just hidden in the interface, so a committee member cannot reach another member's guest by editing the address bar.

## Verification before I call it done

- On your 384x681 phone view, as admin: switch every status tab and the In-person/Zoom filter and confirm the tab counts, the summary line, the row list, and the CSV export all agree.
- Edit one guest end-to-end (status, party size, in-person to Zoom), then re-read that row from the database and confirm the roster totals moved by exactly the expected amount.
- Sign in as a committee member and confirm: their own guests are editable, someone else's guest is not visible and not reachable by URL, and their edit appears in the audit log under their name.
- Confirm a guest with a paid meal cannot lose that meal without the explicit confirmation step, and that no guest record disappears from the roster after any edit.

## Technical details

- `src/routes/_authenticated/admin/guests.tsx`: add the attendance filter control bound to the existing `mode` search param, per-mode counts from the existing `computeRsvpRollup` output, and an edit sheet per row.
- New `src/lib/guest-edit.functions.ts`: authenticated server functions `updateGuestRsvp` and `updateGuestIdentity` using `requireSupabaseAuth`, re-checking `user_roles` (admin = all rows, team = rows whose `inviter_id` resolves to that member) and writing to `invitations` / `rsvps` plus `audit_log`, mirroring the role pattern already used in `src/lib/rsvp-issues.functions.ts`.
- `src/routes/_authenticated/admin.tsx`: add `/admin/guests` to the committee-allowed paths with a committee-facing label.
- Reads stay on the existing `getReconciliationRows` server function, filtered server-side by role scope; no new tables and no migration expected.
