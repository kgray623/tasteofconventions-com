Reorganize the admin top navigation into two grouped rows so personal/event tabs sit together and committee tabs sit together.

## Row 1 — Event & personal
Order:
1. Overview
2. Invitation page
3. Donations
4. My RSVP
5. Restaurants

## Row 2 — Committee
Everything else, in this order:
1. Add guests (Guest list for committee view)
2. Committee SMS
3. Committee (the inviters/roster page)
4. Assignments (Volunteer for committee view)
5. Team access
6. Team chat

## Implementation notes (technical)
- Edit `src/routes/_authenticated/admin.tsx`.
- Tag each entry in the existing `tabs` array with `group: "main" | "committee"` in the order above.
- Replace the single `<nav>` with two stacked nav rows that share the same active-tab styling. Both rows render only the tabs visible to the current user (admin sees all; team sees the `team: true` subset, just like today).
- Keep the underline/active styling, icons, `search={{ view }}` passthrough, and "Back to dashboard" link unchanged.
- No route files are added, removed, or renamed; this is nav layout only.