## Goal
Expand the "Invited by" picker on both RSVP forms so guests can be invited by **any committee member OR any invited guest on the roster** (regardless of RSVP status), with fuzzy name suggestions that tolerate misspellings and partial names.

## Changes

### 1. Server: expand the roster + add fuzzy search
File: `src/lib/invitations.functions.ts`

- Rename intent of `getCommitteeRoster` → `getInviterRoster` (keep old export as alias for back-compat). Returns `{ id, name, kind: "committee" | "guest" }[]` sourced from:
  - `inviters` (active)
  - `invitations` where `is_committee = true` (committee)
  - `invitations` (all others, regardless of RSVP status) — new
  - `team_invites` with role `team`
  Dedupe by lowercased name; committee wins the `kind` tag on tie.
- Add `searchInviterRoster({ q })` server fn that runs trigram fuzzy matching via existing `pg_trgm` (`similarity()` already installed and used by `search_invitations_fuzzy`). Returns top ~10 matches with a similarity score. Also matches:
  - full name (fuzzy)
  - last-name-only queries (e.g. "Gray" → all Grays)
  - first-name-only queries
  - "Sister Gray", "Bro Gray" → strip honorific prefix before matching
- Both fns are public (no auth) since the RSVP form is public. Return only `{ id, name, kind }` — no phone, no email.

### 2. Server: validation
File: `src/lib/invitations.functions.ts` (`assertInvitedByIsCommittee`)

- Rename to `assertInvitedByOnRoster`. Accept a match against the expanded roster (committee OR invited guest). Still rejects empty, `__other__`, and off-roster names. Wire into both `submitRsvp` and `submitPublicRsvp`.

### 3. UI: smarter picker component
File: `src/components/committee-picker.tsx` → rename to `src/components/inviter-picker.tsx`

- Replace the "load full list on mount" pattern with a debounced search-as-you-type against `searchInviterRoster` (falls back to the full roster when the query is empty, capped to ~50 for scrollability).
- Show each result as `Name` + a small badge (`Committee` / `Guest`) so the user can disambiguate.
- When the typed query doesn't exactly match any result but there ARE close matches (similarity ≥ 0.3), show a "Did you mean…?" section listing the top 3 with tap-to-select. Example: typing "Carrie Gray" surfaces "Kari Gray — Did you mean this person?"
- When the query is a last-name-only match (e.g. "Gray"), show all matches grouped so the user can pick the right one.
- Keep the stale-value warning ("… isn't on the list — please pick someone").

### 4. Wire the renamed picker
Files: `src/routes/rsvp.index.tsx`, `src/routes/rsvp.$token.tsx`

- Swap `CommitteePicker` → `InviterPicker`. Update the field label to "Invited by *" and helper text to: "Type the name of the committee member or guest who invited you. We'll suggest close matches."

### 5. Cleanup
- Delete the old sanitize `__other__` effect (already handled by picker in prior turn).
- Keep `getCommitteeRoster` as a thin wrapper that filters `kind === "committee"` so no other caller breaks.

## Verification
- DB: query the expanded roster count and confirm it includes non-committee invited guests.
- `/rsvp` mobile: type "Gray" → see all Grays; type "Carrie Gray" → "Did you mean Kari Gray?"; type "Sister Gray" → honorific stripped, Gray matches shown.
- Submit with a guest-kind inviter → saves; row appears in admin with correct `invited_by`.
- Submit with a name not on the roster → server rejects with clear error.

## Out of scope
- Auto-picking the top match (we always require an explicit tap).
- Exposing phone/email in the picker.
- Backfilling old free-text `invited_by` values on existing RSVPs.
