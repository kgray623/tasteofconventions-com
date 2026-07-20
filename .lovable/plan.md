## Goal
Add the uploaded interior photo of the Hanke Building to the public invitation page so guests can see what the indoor venue actually looks like.

## Changes
1. Upload the photo as a Lovable asset (`src/assets/venue-interior.jpg.asset.json`) from `/mnt/user-uploads/Screenshot_20260719_151001_Chrome-2.jpg` — cropped/kept as-is (venue interior only, no browser chrome).
2. In `src/components/invitation-page.tsx`, inside the **Location** accordion panel, add the photo directly under the "Indoor event — held inside the Hanke Building" callout, above the Google Map. Rounded card, `alt="Inside the Hanke Building — indoor venue for A Taste of Special Conventions"`, with a small caption "Inside the Hanke Building".
3. In the **Indoor or outdoor?** FAQ, also show the same photo so the answer is visual, not just text.

## Not changing
- No copy edits beyond the new caption.
- No changes to RSVP, admin, or database.

## Verification
- Load `/` in the preview, open the Location panel and the Indoor/Outdoor FAQ, and confirm the interior photo renders on mobile (384px) and desktop.
