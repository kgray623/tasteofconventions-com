## Add Indonesian meal photos to RSVP

Add the 3 uploaded Indonesian meal photos under the **Indonesian** cuisine row on `/my-rsvp`, using the same pattern already in place for African.

### Steps

1. Upload the 3 photos as CDN assets (no binaries in repo):
   - `/mnt/user-uploads/20260621_172750.jpg` → `src/assets/indonesian-meal-1.jpg.asset.json`
   - `/mnt/user-uploads/20260621_183629.jpg` → `src/assets/indonesian-meal-2.jpg.asset.json`
   - `/mnt/user-uploads/20260621_183635.jpg` → `src/assets/indonesian-meal-3.jpg.asset.json`

2. In `src/components/my-rsvp-content.tsx`:
   - Import the 3 new `.asset.json` files
   - Add an `indonesianPhotos` array to the `Indonesian` entry in `cuisines`
   - Render a 3-column thumbnail grid under the Indonesian cuisine row (identical markup to the African grid), each tapping into the existing `lightbox` `Dialog`

3. No changes to Myanmar/Burmese row — instructions come next week.

### Out of scope
- Meal-count logic, totals, invitation page, DB — untouched.
- No visual restyle of existing rows.

### Verification
- Load `/my-rsvp` as an attending guest at 384px width
- Confirm 3 Indonesian thumbnails appear under Indonesian only
- Tap each → lightbox opens with the full photo
- African row unchanged

Timestamp: 2026-07-16 UTC
