## Add sort control to the Pending guests list

The Pending group on the committee workspace already has sort logic wired to a `?pendingSort=` URL param (values: `alpha`, `newest`, `oldest`), but there is no visible control — so it always ends up alphabetical. Add a small sort selector directly on the Pending group header.

### Change (frontend only, `src/components/committee-workspace.tsx`)

1. Add a compact Select above (or inside the header of) the "Pending" `MyGuestsGroup` with three options:
   - **A → Z (name)** — `alpha`
   - **Newest uploaded first** — `newest`
   - **Oldest uploaded first** — `oldest`
2. Selecting an option calls `navigate({ search: (prev) => ({ ...prev, pendingSort: value }) })` so the choice sticks in the URL and the existing `activePendingSort` / `byPendingSort` logic picks it up. Default remains `alpha`.
3. Only render the control when the Pending group has more than one guest, and only for the Pending group (RSVP in person, RSVP by Zoom, Declined are untouched).

### Verification

- Load `/` as a committee member on mobile viewport (matches the screenshot). Confirm the Pending header shows the sort selector.
- Switch to Newest / Oldest and confirm the Pending list re-orders by upload date (`created_at`), and A → Z re-orders alphabetically.
- Confirm no other groups, counts, or data change.

Timestamp: 2026-07-15 23:15 UTC.
