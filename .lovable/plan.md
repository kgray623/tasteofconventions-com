Add bright red NEW badges (with arrow pointing at the change) to every committee-facing feature we've shipped recently, so team members can spot what's new. Badges auto-hide after 14 days or once tapped.

## Where badges go

Each entry below names the screen, the spot, and the arrow direction.

**`src/components/rsvp-totals-card.tsx`** (committee + admin)
- `committee:my-rsvp-label` → NEW → next to "My RSVP" tile
- `committee:my-guests-label` → NEW → next to "My Guests" tile
- `committee:my-in-person-label` → NEW → next to "My In-Person" tile
- `committee:my-rsvps-left-label` → NEW → next to "My RSVPs Left" tile

**`src/components/committee-workspace.tsx`**
- `committee:guests-uploaded-header` → NEW → on the "My Guests Uploaded" card header
- `committee:filter-toggle` → NEW → pointing at the All / Committee filter buttons
- `committee:committee-badge` → NEW → next to the first row that shows the new "Committee" tag (one-time, in header area not per-row to avoid spam)
- `committee:edit-guest` → NEW ← (arrow LEFT) next to the pencil icon column header
- `committee:delete-guest` → NEW ← (arrow LEFT) next to the trash icon column header

**`src/routes/_authenticated/admin/inviters.tsx`** and **`src/routes/_authenticated/dashboard.tsx`**
- `admin:in-person-confirmed-column` → NEW → next to the "In-Person Confirmed" column/stat we just added

## Implementation details

1. Extend `NewBadge` in `src/components/new-badge.tsx` to accept a `direction?: "right" | "left"` prop (default `"right"`). When `"left"`, render `ArrowLeft` before the word NEW instead of `ArrowRight` after it. Add `ArrowLeft` import.

2. Register all keys above in `WHATS_NEW` in `src/lib/whats-new.ts` with `addedAt: "2026-06-16"`.

3. Drop `<NewBadge target="..." />` (or `direction="left"` variant) inline beside each target element in the four files listed. No layout restructuring — badges are inline-flex and sit adjacent.

## Out of scope
- No changes to badge dismissal logic, expiry window, or storage.
- No new pages or business logic — purely visual annotation of existing UI.
- Admin-only screens that team members can't see get no badge.
