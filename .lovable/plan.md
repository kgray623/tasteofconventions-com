## What's wrong

On mobile the committee/admin pages have several inner lists set to `max-h-[360px|480px|520px] overflow-auto` (my guests list, RSVP confirmations, pending/in-person groups, upload page current guest list). At 384px wide × 673px tall — your phone — those inner scrollers fill most of the visible area, so every touch drag scrolls the inner list instead of the outer page. That's why you can refresh and the page still "won't slide down" — the outer page IS scrollable, but your finger keeps landing inside a nested scroller that eats the gesture.

Programmatic scroll works (`window.scrollTo(0, 500)` moves the page), which confirms nothing global (no open modal, no `overflow: hidden` on body, no scroll-lock) is blocking the page.

## Fix (Update UTC: 2026-07-12 23:05)

Drop the fixed inner-scroll cap on mobile — only cap the height on desktop where the nested scroller is useful. Change `max-h-[Npx] overflow-auto` → `md:max-h-[Npx] md:overflow-auto` in these six spots so mobile lets the list flow inline with the page:

1. `src/components/committee-workspace.tsx` line 772 — My RSVP confirmations list.
2. `src/components/committee-workspace.tsx` line 837 — My full guest list.
3. `src/components/committee-workspace.tsx` line 1065 — MyGuestsGroup rows (In person / Zoom / Decline / Pending).
4. `src/routes/_authenticated/admin/upload.tsx` line 1568 — parsed/preview list.
5. `src/routes/_authenticated/admin/upload.tsx` line 1753 — confirmed guests card.
6. `src/routes/_authenticated/admin/upload.tsx` line 2143 — current guest list.

## Not changing

- No changes to counts, data, RSVP logic, or Send-text button just added.
- Desktop behavior unchanged.

## Verification

Playwright at 384×673 mobile viewport, load `/admin?view=committee`, scroll to bottom of the page, screenshot to confirm the whole page scrolls freely and every guest row is reachable by scrolling the page (not trapped in a nested scroller). Repeat on `/admin/upload?view=committee`.
