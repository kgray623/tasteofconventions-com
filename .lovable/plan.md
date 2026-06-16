## Add NEW badge to the Hide button on the Welcome Video

The committee workspace already has a **Hide** button next to "Watch the Welcome Video" (line 226 of `src/components/committee-workspace.tsx`). I'll mark it as new.

- **Edit** `src/lib/whats-new.ts` — add `"committee:hide-welcome-video": { addedAt: "2026-06-16" }`.
- **Edit** `src/components/committee-workspace.tsx` — import `NewBadge` and render it inline to the left of the Hide button so the bright red NEW → arrow points right at it.
- Clicking Hide (or the badge itself) marks it seen, so it disappears once used.

No other changes.
