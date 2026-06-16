## Scale back NEW badges to feature-level, shrink them, remove from rows

### Rule going forward

A NEW badge marks a newly added/changed **feature** — never a piece of data (no NEW next to a person's name, a guest count, or any list row). One badge per feature, placed at its header/label.

### NEW badges to keep / add

1. **RSVP Totals** card title — NEW badge
2. **My RSVP** label (the new card on the committee workspace + matching label in the totals card) — NEW badge
3. **All / Committee filter toggle** header — NEW badge (it's a brand-new feature)
4. **Edit/Delete icons** — one small NEW badge near the column header for the pencil/trash actions (feature, not per row)

### Removals (per-row and redundant)

In `src/components/rsvp-totals-card.tsx`:
- Remove NEW badges from "My Guests", "My In-Person", "My RSVPs Left"
- Add NEW badge on the card title "RSVP Totals" and keep one on "My RSVP"

In `src/components/committee-workspace.tsx`:
- Remove NEW badge from the per-row "Committee" tag in: My Guests Uploaded rows, Confirmed RSVPs rows, and the Guest list rows (this is what's putting NEW next to Jacqueline Spears, Jamie Elker, Carrie Gray, Melissa Novotne, etc.)
- Remove NEW badge from the "My Guests Uploaded" header
- Keep one NEW badge on the All / Committee filter toggle (header level)
- Replace any per-row pencil/trash NEW badge with a single NEW badge on the actions column header

In `src/routes/_authenticated/dashboard.tsx`:
- Remove NEW badge from "Confirmed in person" tile (not a new feature)

In `src/routes/_authenticated/admin/inviters.tsx`:
- Remove NEW badge from "In-person" column header (not a new feature)

### Smaller badge styling

In `src/components/new-badge.tsx`:
- Text `text-[10px]`, `leading-none`, `font-semibold`
- Padding `px-1 py-0`, `gap-0.5`, `rounded-sm`
- Arrow icon `h-2.5 w-2.5`
- Keep red background, keep directional arrow (left/right) support

### Registry cleanup

In `src/lib/whats-new.ts`, keep only these keys:
- `committee:rsvp-totals-card`
- `committee:my-rsvp-label`
- `committee:filter-toggle`
- `committee:row-actions` (pencil/trash column header)

Remove all other keys added last round so stray badges can't render.

### Out of scope

No logic, layout, or business-rule changes. No edits to admin-only screens beyond the two removals listed.
