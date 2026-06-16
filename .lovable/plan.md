## Goal
On the committee workspace's **My Guests Uploaded** card, mark which uploaded guests are themselves on the committee (independent of whether they've RSVP'd), and add a **Committee** filter button. Also unify how "is on the committee" is detected so the count is consistent.

## Why committee numbers look off today
There are three separate places a person can be flagged as committee, and different parts of the app check only one:

```
inviters (active=true)                ── 15 rows
team_invites (role='team')            ──  7 rows
invitations (is_committee=true)       ──  8 rows
user_roles (role='team')              ── 11 rows
```

`get_public_inviters` already unions inviters + team_invites + invitations.is_committee and dedupes by name. That's the right "full committee" set (~your 18). Several screens only look at `invitations.is_committee` (8), which is why they look short.

## Changes

### 1. `src/components/committee-workspace.tsx` — My Guests Uploaded
- Build a `committeeLookup` once on load:
  - Query `inviters` (name, phone), `team_invites` (name, phone_normalized) where role='team', and reuse the already-loaded `invitations` rows where `is_committee=true`.
  - Index by normalized name (lowercase, letters only) and by last-10-digit phone.
- Tag each `myGuests` row with `isCommittee` if its normalized name OR phone tail matches the lookup.
- Render a small **Committee** badge next to the guest name when `isCommittee` is true (next to the existing Duplicate badge).
- Add a filter toggle row above the list: **All (n)** / **Committee (n)**. When Committee is selected, only committee-tagged guests show.
- Update the card header count to reflect the active filter.

### 2. Same lookup, applied to the existing "Confirmed RSVPs" and "Guest list" sections
- Show the same Committee badge there so the marker is consistent across the page. No filter buttons added to those (only My Guests Uploaded), per request.

### 3. Out of scope
- No DB/migration changes — the union logic stays in the component.
- No edits to admin screens (`admin/inviters`, `admin/team`, `admin/subcommittee`, dashboard). If you want those reconciled to the same 18-person union next, that's a separate pass — say the word and I'll do it.

## Technical notes
- Normalization helpers already exist locally (`normName`, `normPhoneTail`); reuse them.
- Lookup loads in parallel with `loadGuests`; stored in component state.
- No new dependencies, no schema changes.