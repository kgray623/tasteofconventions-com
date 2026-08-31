# Photo album: save/download button (video + likes already shipped)

Current state, confirmed by reading the code and database:

1. **Video support — already live** (commit `c5c11ea`). `shared_photos.media_type` ('image' | 'video') exists, the bucket accepts up to 50 MB per file, uploads accept `image/*,video/*`, videos play inline with controls in the feed and in the lightbox, and they take part in next/previous navigation like photos.
2. **Likes — already live.** `public.photo_likes` exists with `photo_id`, `user_id`, `liker_name`, `created_at`, a unique constraint on `(photo_id, user_id)`, participant-only RLS mirroring comments, and a heart button with count in the feed and viewer (verified: like toggled and read back from the database).
3. **Save/download button — not built yet.** This is the only remaining item.

## What you'll get

A "Save" button on every photo and video, in both the feed card and the lightbox viewer. Tapping it downloads that exact file to the person's device with a sensible filename (for example `taste-of-conventions-kari-gray-1.jpg`). On phones where the browser prefers opening media instead of downloading, the button falls back to opening the file in a new tab so it can be saved with a long-press / share sheet — no silent no-op.

## Technical details

New file:
- `src/components/media-save-button.tsx` — small reusable button. Fetches the already-signed storage URL as a blob, creates an object URL, triggers an `<a download>` click, then revokes the object URL. Derives the extension from the stored path and the filename from the uploader name plus item index. If the blob fetch fails (offline, expired signed URL), it opens the signed URL in a new tab and shows a short toast explaining the long-press save.

Edited files:
- `src/components/shared-photo-album.tsx` — render the save button next to the existing like button in each feed card, and in the grid tile overlay next to the delete control.
- `src/components/photo-viewer.tsx` — render the save button in the viewer's caption/metadata row, alongside like and comments.

No schema change, no migration, no bucket change, no new server function — the album already holds signed URLs for every row. Nothing outside the shared album is touched (no RSVP, meal, payment, or texting code).

## Verification before reporting done

- Playwright at 390x844 on `/admin/my-rsvp` signed in as admin: click Save on a photo, confirm a real download event fires with the expected filename and non-zero bytes.
- Repeat on a freshly uploaded test video, confirm the downloaded file size matches the uploaded file, then delete the test video and confirm zero leftover rows in `shared_photos`, `photo_likes`, and zero leftover files in the bucket.
- Confirm the save button also renders and fires inside the lightbox viewer and in grid layout, and that no console errors appear.
