Add the three uploaded food photos to the African cuisine option in the RSVP pre-order flow.

**Where they'll appear**
In the "Pre-order your cultural meal" card on the My RSVP page (`src/components/my-rsvp-content.tsx`), under the "African" choice — a small photo strip (3 thumbnails, tap to enlarge in a lightbox) shown below the label, only for the African cuisine row.

**Assets**
Upload the three JPGs (`20260628_180020.jpg`, `20260628_180027.jpg`, `20260628_180030.jpg`) via `lovable-assets` from `/mnt/user-uploads/` and store `.asset.json` pointers under `src/assets/`. No binaries added to the repo.

**Code changes (UI only, no business logic)**
- Import the three asset pointers in `src/components/my-rsvp-content.tsx`.
- Extend the cuisines array so the African entry carries a `photos` array; render the strip only when photos exist.
- Reuse existing shadcn `Dialog` for the enlarge-on-tap view; alt text: "African cultural meal — example dish".

**Out of scope**
No DB changes, no changes to Myanmar/Indonesian rows, no changes to the invitation page (which is separate content). Meal-count logic and totals are unchanged.

**Verification**
Load `/my-rsvp` as an attending guest at mobile viewport (matching current 384px preview), confirm the three photos render under African, tap to enlarge works, and existing Yes/No + qty controls still function.