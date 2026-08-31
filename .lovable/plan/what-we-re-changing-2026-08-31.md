Add video-duration guidance to the shared photo album page

## What we're changing
Replace the generic "full-length phone videos are fine" helper text under the upload button with specific, easy-to-read duration guidance based on video resolution.

## Exact wording to add
"720p videos: about 10–15 minutes. 1080p videos: about 5–7 minutes."

## Where
`src/components/shared-photo-album.tsx`, directly under the "Upload photos or videos" button (currently lines 291–293).

## Why
Guests are getting upload errors on short videos and assume the cap is smaller than it is. Showing concrete minute estimates by resolution removes that confusion.

## Verification
- Preview the photo album component on mobile and desktop.
- Confirm the new text appears directly under the upload button.
- Confirm no other upload-related text or behavior changes.
