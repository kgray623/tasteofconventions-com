## Fix the NEW badge + add it to every new thing from today

### Badge redesign — `src/components/new-badge.tsx`
- **Color:** bright red (new `--brand-red` token in `src/styles.css`, e.g. `oklch(0.62 0.24 27)`), not terracotta.
- **Size:** bigger — `text-sm`, `px-3 py-1.5`, bolder shadow, larger arrow (`w-5 h-5`, `strokeWidth={3}`).
- **Position:** sits to the **LEFT** of the target element (inline), arrow points **RIGHT** at it. No more absolute overlay on top of the item.
- Keeps pulse animation + click-to-dismiss + 14-day auto-hide.
- New layout helper `<NewBadgeRow>{children}</NewBadgeRow>` that renders `[NEW →] [item]` in a flex row so callers don't have to repeat the wrapper.

### Add the badge to every new thing from today

Append to `WHATS_NEW` registry and wire a `<NewBadge>` on the LEFT of each:
1. **Notification bell** — in `src/components/site-header.tsx`, wrap `<NotificationBell />` with the badge row. Key: `header:notification-bell`.
2. **Download the app button** — already wired in `src/routes/_authenticated/admin.tsx`, switch from absolute overlay to inline-left. Key stays `admin:install-button`.
3. **RSVPs dashboard tile** — already wired in `src/routes/_authenticated/admin/index.tsx`, switch from absolute overlay to a small inline pill above the tile label so it sits to the left of the number. Key stays `admin:rsvps-tile`.
4. **Clickable dashboard tiles + back button feature** — add badge to the dashboard heading area on `/admin` so users notice the whole grid is now navigable. Key: `admin:clickable-tiles`.

### Files
- **Edit** `src/styles.css` — add `--brand-red` token + Tailwind utility class `bg-brand-red`.
- **Edit** `src/components/new-badge.tsx` — red, bigger, left-side layout; export `NewBadgeRow`.
- **Edit** `src/lib/whats-new.ts` — add 2 new keys (`header:notification-bell`, `admin:clickable-tiles`).
- **Edit** `src/components/site-header.tsx` — wrap bell with badge.
- **Edit** `src/routes/_authenticated/admin.tsx` — replace absolute overlay with inline left badge; add `admin:clickable-tiles` badge next to the heading.
- **Edit** `src/routes/_authenticated/admin/index.tsx` — replace absolute overlay with inline left badge on RSVPs tile.

### Not changing
- Any non-new UI.
- Dismissal/expiry logic.
- Auth, data, server functions.
