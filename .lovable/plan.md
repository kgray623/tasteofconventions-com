## Remove NEW from the Welcome heading

- **Edit** `src/routes/_authenticated/admin.tsx` — remove `<NewBadge target="admin:clickable-tiles" />` from next to the heading, and restore the heading wrapper to its original (no flex/gap).
- **Edit** `src/lib/whats-new.ts` — delete the unused `admin:clickable-tiles` entry.

Keep the NEW badges on:
- Notification bell
- Download the app button
- RSVPs tile (already approved earlier)

No other changes.
