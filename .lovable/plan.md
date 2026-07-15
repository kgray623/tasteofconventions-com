## The real bug

In `src/components/committee-workspace.tsx`, tab counts call:

```ts
const peopleCountFor = (rows) => rollupFor(rows).people.allIfEveryoneShowed;
```

But in `src/lib/rsvp-math.ts`, `people.allIfEveryoneShowed` is defined as `grouped.size` — that's the number of dedup'd rows (25 for confirmed), NOT the sum of `party_size` (35 seats). That's why the tab still says "Confirmed (25)" while the section header correctly says "Confirmed RSVPs (35)".

The previous edits changed *which field* was read but not the underlying math, so nothing visibly changed. That's on me.

## Fix (one file: `src/components/committee-workspace.tsx`)

Replace `peopleCountFor` so each tab returns actual seats (sum of `party_size`) for the rows that belong to it, matching the section header math:

- Confirmed tab → `rollup.people.confirmed` (= inPerson + zoom seats, i.e. 35)
- Pending tab → `rollup.people.pending`
- Declined tab → `rollup.people.declined`
- All tab → sum of `people.confirmed + pending + declined + maybe + waitlist` (total seats if every row were honored at its party_size)
- Latest upload tab → same "total seats" sum applied to the latest batch only

No changes to `rsvp-math.ts` (other pages depend on `allIfEveryoneShowed` meaning "group count"), no data-fetching changes, no header/banner changes (those already show people-only after the last edit).

## Verification

After the edit, at 384×673 on `/admin` signed in as committee, hard-reload (bypass the PWA cache) and confirm:
- Confirmed tab shows **(35)**, matching the "Confirmed RSVPs (35)" header
- Pending tab count matches the "Pending (N)" header
- Declined tab count matches the "Decline (N)" header
- All tab count = sum of the three above (+ any maybe/waitlist seats)

If the browser still shows the old numbers, it's the service worker — I'll bump the SW version to force refresh.

Timestamp: 2026-07-15 20:55 UTC.