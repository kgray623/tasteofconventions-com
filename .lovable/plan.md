## Restore the grouped guest list

Re-section the "Current guest list" on `/admin/upload` (in `src/routes/_authenticated/admin/upload.tsx`) into the categories you asked for, using each guest's **effective** RSVP (so duplicates inherit a sibling's RSVP as already implemented):

1. **RSVP yes** — alphabetical by guest_name
2. **RSVP waitlist** — alphabetical by guest_name
3. **RSVP no** — alphabetical by guest_name
4. **No response yet** — alphabetical by guest_name (everyone else: not sent, sent-not-replied, maybe). Kept separate so pending guests don't disappear from the list. If you want this one removed or renamed, say so.

Each section gets a small header with the count (e.g. "RSVP yes (42)") and is collapsible-like only visually — no behavior change beyond grouping + alpha sort. All existing per-row controls (edit name, mark sent, set RSVP, remove, duplicate badge) stay exactly as they are. Totals card and duplicate detection are unchanged.

No DB or server changes.