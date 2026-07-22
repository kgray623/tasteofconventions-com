## Add Burmese/Myanmar meal photos to the RSVP cuisine picker

The four uploaded photos (samosas with dipping sauce, fried rice + tea-leaf salad, chicken with rice + noodles, and beef curry + fried rice) will be added as the Myanmar/Burmese photo strip on the RSVP meal pre-order card — matching how African and Indonesian already display.

### Steps

1. Upload each of the 4 images via `lovable-assets create` from `/mnt/user-uploads/` and save pointers:
   - `src/assets/myanmar-meal-1.jpg.asset.json` (samosas)
   - `src/assets/myanmar-meal-2.jpg.asset.json` (fried rice + tea leaf salad)
   - `src/assets/myanmar-meal-3.jpg.asset.json` (chicken + noodles)
   - `src/assets/myanmar-meal-4.jpg.asset.json` (beef curry + fried rice)

2. Edit `src/components/my-rsvp-content.tsx`:
   - Import the 4 new asset pointers, build `myanmarPhotos` array.
   - In the `cuisines` array, replace the Myanmar entry's `note: "Photos coming soon"` with `photos: myanmarPhotos` so the same thumbnail grid + lightbox used for African/Indonesian renders.

3. Edit `src/routes/rsvp.$token.tsx` the same way if it renders its own Myanmar photo strip (the earlier turn added photos to meal cards there too).

4. Verify on mobile viewport at `/rsvp/$token` and `/admin/my-rsvp`: Myanmar card shows 4 thumbnails, tapping opens the lightbox.

### Notes

No copy/text change — only images. "Beef or chicken, gluten-free, $20–$30" wording stays. If you'd like the "coming next week" wording removed elsewhere (e.g. any leftover note), I'll strip that too during the edit.
