## What

Show a bright **NEW →** badge on dashboard tiles (and other newly added UI) for any feature I add, until the user has seen it. No backend table needed — entirely client-side using `localStorage`.

## How it works

1. **Feature registry** — a single source of truth at `src/lib/whats-new.ts`:
   ```ts
   export const WHATS_NEW: Record<string, { addedAt: string; expiresInDays?: number }> = {
     "admin:install-button": { addedAt: "2026-06-16" },
     "admin:rsvps-tile":      { addedAt: "2026-06-15" },
     // future entries appended here every time I ship something new
   };
   ```
   Each entry has a stable key + the date I shipped it. Default badge lifetime: 14 days from `addedAt`, or until the user dismisses it (whichever comes first).

2. **`useIsNew(key)` hook** — returns `true` when:
   - the key exists in `WHATS_NEW`,
   - `now − addedAt < expiresInDays`, AND
   - `localStorage["whatsnew:seen:<userId>:<key>"]` is not set.

3. **`<NewBadge target={key} />` component** — renders a bright terracotta pill `NEW ←` with a small arrow icon, pointing at the thing it's attached to. Clicking the tile (or the badge's ✕) marks it seen in `localStorage` so it disappears for that user.

4. **First wiring** — add badges to the two genuinely-new items on the admin dashboard right now:
   - The **Download the app** button in the admin header
   - The **RSVPs** tile on `/admin`

## Going forward — my rule

Every time I add a new tile, button, or page to the admin dashboard (or anywhere user-facing), I will:
- append an entry to `WHATS_NEW` with today's date,
- wrap or place a `<NewBadge target="..." />` next to the new UI.

Users see a bright `NEW ←` arrow for ~2 weeks or until they interact with it, then it auto-disappears.

## Files

- **New** `src/lib/whats-new.ts` — feature registry + `useIsNew` hook + `markSeen` helper.
- **New** `src/components/new-badge.tsx` — the bright pill+arrow component.
- **Edit** `src/routes/_authenticated/admin.tsx` — add `<NewBadge target="admin:install-button" />` next to the install button.
- **Edit** `src/routes/_authenticated/admin/index.tsx` — add `<NewBadge target="admin:rsvps-tile" />` on the RSVPs tile, and call `markSeen` when any tile is clicked.

## Not changing

- No database tables — no `last_seen_at` tracking on the server (you said features, not data activity).
- No edits to features that aren't new.
- The actual auth/last-login flow stays exactly as it is.
