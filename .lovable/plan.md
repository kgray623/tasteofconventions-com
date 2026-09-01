# Share long videos by link (YouTube, Google Drive, etc.)

Videos over the 1 GB upload cap can't be uploaded directly. Add a way for guests to post a **video link** into the same shared album, so long videos live on YouTube/Drive/Dropbox/iCloud and appear alongside uploaded photos and videos.

## What guests will see

- On the album page, next to the upload button: **"Have a longer video? Add a link"**.
- Tapping it opens a small form: paste the video URL, optional caption. Their name is filled in automatically (same as uploads).
- Posted links show up in the newest-first grid as a card with a play badge and, when available, the YouTube thumbnail. Tapping opens the video in a new tab (YouTube plays inline in the album viewer).
- Same gold/berry styling as the rest of the album. The person who posted it can delete it, same as uploads.
- Helper text updated so the 1 GB limit and the "longer video? use a link" option are stated together, plus corrected duration estimates for 1 GB (720p about 20-30 min, 1080p about 10-15 min).

## Accepted links

YouTube, YouTube Shorts, Vimeo, Google Drive, Dropbox, OneDrive, iCloud shared links, and any other https link. Non-https or obviously bad input gets a friendly inline message rather than an error dump.

## Technical notes

- Reuse the existing `shared_photos` table: add nullable `external_url` and allow `media_type = 'link'`. Migration includes the column, a check that a row has either `storage_path` or `external_url`, and GRANTs/RLS matching the existing table policies (insert by participants, delete by owner).
- `src/components/shared-photo-album.tsx`: add the link form + submit handler (insert row, no storage call), and extend the render path so `media_type === 'link'` renders a link card / YouTube embed instead of `<video src>`.
- New small helper `src/lib/video-links.ts`: normalize/validate URL, detect YouTube/Vimeo IDs, derive embed URL and thumbnail URL.
- No change to upload limits, storage bucket, or the texting pages.

## Verification

Playwright at 390 px, signed in: post a YouTube link, confirm the row is written in the database, the card renders newest-first with a thumbnail, opening it plays the video, and delete removes it. Report exact row counts with a UTC timestamp.
