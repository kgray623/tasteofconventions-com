## Cuisine headings above meal photos

Add a bold cuisine-type heading above each meal's photo strip on the RSVP/preorder meal cards, so the order reads: heading → photos → description.

### Changes

1. **`src/components/my-rsvp-content.tsx`** (and `src/routes/rsvp.$token.tsx` / `src/routes/rsvp.index.tsx` meal cards — whichever renders the photo strips):
   - Above each cuisine's photo strip, render a bold heading:
     - **Myanmar (Burmese)** — caption below: "Photos coming soon"
     - **African** — photo strip + lightbox below, then description
     - **Indonesian** — photo strip + lightbox below, then description
   - Keep existing photos, lightboxes, and selection behavior unchanged.

2. **Description placeholders**: leave the current African and Indonesian descriptions as-is for now. When you send the new African description, I'll drop it in.

### Out of scope
No changes to selection logic, pricing, or the "Invited by" picker.

### Verification
Playwright on mobile (384×681) on `/rsvp/<token>`: screenshot each meal card and confirm heading appears above the photos in bold.
