## Sort the Confirmed RSVPs list alphabetically

In `src/routes/_authenticated/admin/upload.tsx`, the "Confirmed RSVPs" card (around lines 1355–1405) renders two sub-lists — in‑person and Zoom — by mapping `confirmedGuests` directly with no sort, so names appear in RSVP-arrival order.

Change: sort both sub-lists alphabetically by `guest_name` using the same case-insensitive `localeCompare` comparator already used for the grouped guest list below (`byName`). Specifically:

- Build a shared `byName` comparator at the top of the render (reuse the existing one if hoisted, otherwise add a local one in this card).
- Apply `.sort(byName)` to the filtered `confirmedGuests.filter(g => g.attendance_mode !== "zoom")` list before `.map(...)`.
- Apply `.sort(byName)` to the filtered `confirmedGuests.filter(g => g.attendance_mode === "zoom")` list before `.map(...)`.

No changes to totals, data fetching, or any other component. Counts in the header stay as-is. The grouped guest list below (yes / waitlist / no / no response yet) is already alphabetical and is not touched.

If you want, I can also do a sweep of other admin lists (Committee, Restaurants, Assignments, etc.) and force alphabetical order everywhere — say the word and I'll add that to the plan.
