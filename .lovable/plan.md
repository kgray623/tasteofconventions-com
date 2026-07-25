## Plan

1. **Fix the missing Burmese/Myanmar food photos on the public RSVP page**
   - Add the existing four `myanmar-meal-*.jpg.asset.json` photo imports to `/rsvp`.
   - Replace the current `Myanmar/Burmese — Photos coming soon` entry with the actual Burmese/Myanmar photo grid.

2. **Keep the already-wired screens intact**
   - The token RSVP page (`/rsvp/$token`) and My RSVP content already reference the Burmese/Myanmar photos, so I will not rewrite those unless verification shows they still fail to render.

3. **Verify on the actual mobile-sized RSVP view**
   - Open `/rsvp` at the current mobile viewport.
   - Confirm the Burmese/Myanmar meal card shows photos, not “Photos coming soon.”
   - Check the photo thumbnails render and can open in the lightbox.

## Technical details

- Current confirmed gap: `src/routes/rsvp.index.tsx` imports only African and Indonesian food images, and its Myanmar/Burmese cuisine row still says `Photos coming soon`.
- Existing Burmese/Myanmar asset pointers are already present in `src/assets/myanmar-meal-1.jpg.asset.json` through `myanmar-meal-4.jpg.asset.json`.