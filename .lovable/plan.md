## Goal
Answer the guest question ("indoors or outdoors?") directly on the invitation FAQ.

## Change
File: `src/components/invitation-page.tsx` — Location accordion item.

Add a short indoor/venue note directly under the venue name so guests see it without opening any external link:

> **Indoor event** — held inside the Hanke Building. Climate-controlled with plenty of seating; no weather worries.

Rendered as a small callout line above the embedded map (in the Location accordion), so it also shows up when someone specifically checks Location.

## Out of scope
- No DB schema change. Note is added as static copy in the Location accordion (the `location_body` field is admin-editable and doesn't currently mention indoor/outdoor; hardcoding this line guarantees it shows on every invitation immediately).
- No change to committee workspace or admin editors this turn.

## Verification
- Load `/` on mobile viewport, expand **Location** → confirm the indoor / Hanke Building line renders above the map.
