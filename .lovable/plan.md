## Goal
Bring the public guest RSVP page (`tasteofconventions.com/rsvp`) to parity with the committee/token RSVP: show the African and Indonesian meal photos, and correct the pricing/details copy.

## Changes

### 1. `src/routes/rsvp.index.tsx` (public guest RSVP)
- Import the six existing meal assets (`african-meal-1..3`, `indonesian-meal-1..3`) already used on the token/committee RSVP.
- Extend the `cuisines` array so African and Indonesian entries carry a `photos` array (Myanmar stays photo-less with a "Photos coming next week" note).
- In each cuisine card, render a thumbnail strip with a lightbox on click — reuse the same pattern already in `src/routes/rsvp.$token.tsx` (either lift the small photo strip / dialog markup or extract a tiny shared component).
- Update the pricing/details paragraph (line 373) from:
  > "Cultural meals are in the twenty to twenty-five dollar range per meal…"
  to:
  > "Cultural meals are in the twenty to thirty dollar range per meal. Each cuisine offers a beef and a chicken option, and gluten‑free options are available. Click below to pre-order — we'll negotiate with the restaurant once we have a meal count total. You'll get the menu to confirm in the coming weeks and pay the restaurant directly."

### 2. `src/routes/rsvp.$token.tsx` and `src/components/my-rsvp-content.tsx`
- Update the same "twenty to twenty-five" pricing sentence to the new "twenty to thirty" copy with the beef/chicken/gluten-free + pay-restaurant-direct wording, so all three RSVP surfaces match.

### 3. `src/routes/preorder.tsx` (line 120)
- Change "Catered meals will be in the $25.00 range per meal." to "Catered meals will be in the $20–$30 range per meal (beef or chicken, gluten‑free options available). You'll pay the restaurant directly when you confirm."

## Out of scope
- No DB changes, no changes to totals math, no changes to the Myanmar row (waiting on next week's photos).
- Committee/admin dashboards untouched.

## Verification
- Load `/rsvp` on mobile viewport: African + Indonesian rows show thumbnails; tapping opens lightbox; pricing text reads $20–$30 with beef/chicken/GF note.
- Load `/rsvp/<token>` and `/my-rsvp`: pricing text matches.
- Load `/preorder`: pricing text matches.
