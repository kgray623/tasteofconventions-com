## Reorder RSVP totals card — My RSVPs first

On the committee dashboard, the "RSVP totals" card currently shows the event-wide totals first and the personal "My RSVPs" block underneath. Flip the two blocks so personal totals come first.

### Changes

**`src/components/rsvp-totals-card.tsx`**
- Move the "My RSVPs" section (currently lines ~124–160: label, personal 4-up stat grid, "My Zoom guests RSVP'd" line, `RequestMoreButton`) to render **before** the event-wide block.
- Event-wide block (Total seats / RSVP requests / Seats available / In-person confirmed grid, progress bar, "RSVP Zooms" line) moves **below** the personal block.
- Insert a divider (`border-t pt-3`) above the event-wide block instead of above the personal one, so the visual grouping still reads cleanly.
- Keep the closing italic disclaimer ("Only in-person guests use spots…") at the very bottom, unchanged.
- No changes to data fetching, math, `RequestMoreButton`, `Stat`, or props.

### Resulting order inside the card

```text
[ My RSVPs ]
  My RSVP request | My guests uploaded | My in-person RSVP'd | My in-person spots left
  My Zoom guests RSVP'd: N
  [Request more] (when applicable)
────────────────────────
[ Event totals ]
  Total seats | RSVP requests | Seats available | In-person confirmed
  progress bar
  RSVP Zooms: N
Only in-person guests use spots…
```

### Committee dashboard card order (unchanged, matches request)

1. RSVP totals card (now My RSVPs → Everyone inside)
2. My Guests Uploaded card

### Out of scope

- No changes to `committee-workspace.tsx` layout, `My Guests Uploaded`, or the `My RSVP confirmations` section further down.
- No new data, no schema changes.
