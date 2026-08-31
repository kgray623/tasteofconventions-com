# Shared album: video uploads + likes

Two additions to the shared photo album only. No RSVP, meal, payment, or texting code is touched.

## What you'll see

1. **Videos in the album** — The upload button accepts short videos as well as photos. A video shows up in the feed with normal play/pause/volume controls, and opens in the same full-screen viewer, where it sits in the same next/previous order as photos (arrows, keyboard, swipe all work the same). The grid view shows a video thumbnail with a small play badge.
2. **Likes** — Every photo and video gets a heart button with a count, in the feed card and in the viewer. Tap to like, tap again to unlike; one like per person per item. Your own like shows the heart filled in gold/berry; the count reads like "12".

Upload limits: videos are capped by the album bucket's file size limit. The bucket is currently 15 MB, which is too small for phone video, so it will be raised to 50 MB. If the workspace-wide storage limit rejects that, the plan falls back to the highest allowed value and the upload form states the cap plainly ("videos up to X MB, about 30 seconds"). Oversized files are rejected client-side with a friendly message instead of a raw storage error.

## Database changes

One migration:

- `shared_photos` gains `media_type text not null default 'image'` with a check constraint allowing `'image'` and `'video'`. Existing rows stay `'image'` — nothing is dropped or rewritten.
- New `public.photo_likes`:
  - `photo_id` → `shared_photos(id)` on delete cascade
  - `user_id` (the liker, from auth)
  - `liker_name` (text, for display consistency with comments)
  - `id`, `created_at`
  - `unique (photo_id, user_id)` — enforces one like per person per item
- Access rules mirroring `photo_comments`:
  - Only signed-in event participants can view likes (`is_event_participant()`).
  - A participant may add a like only as themselves.
  - A person may remove only their own like; admins may remove any.
  - GRANTs for `authenticated` and `service_role`; no anonymous access.
  - Admin check reads `user_roles` directly (same as the fixed comments delete policy, since `has_role` is not executable by `authenticated`).

Bucket: `guest-photos` file size limit raised to 50 MB via the storage bucket tool (not SQL). Bucket stays private; playback keeps using signed URLs.

## Technical details

Files:

- `src/components/shared-photo-album.tsx` — accept `image/*,video/*` in the file input, detect type from the file MIME, set `media_type` on insert, client-side size check, load likes in one batched query (`in('photo_id', ids)`), group client-side, render `<video controls preload="metadata">` for video rows in the feed, keep the existing upload / signed-URL / owner-delete / auth-restore logic intact.
- `src/components/photo-viewer.tsx` — render `<video controls>` instead of `<img>` when `media_type === 'video'`, pause the video when navigating away, keep arrows/keys/swipe and the "N of M" counter unchanged (swipe still works; the control bar keeps its own touch handling).
- `src/components/photo-likes.tsx` (new) — heart button + count, optimistic toggle, insert/delete against `photo_likes`, error toast on failure. Reused in the feed card and the viewer.
- One migration as described above.

Notes:
- Media type is stored, not guessed from the file extension at render time, so playback is reliable.
- Likes and comments are loaded together with the album so navigation needs no extra fetch.
- Styling continues the existing gold/berry card language; no design-token changes.

## Verification before reporting done

- Playwright at 390x844 signed in as admin on `/admin/my-rsvp`: upload a real short test video, confirm the feed renders a `<video>` element with controls and the row's `media_type` is `'video'` in the database.
- Open the viewer, confirm the video appears in navigation order (counter changes, element switches between `img` and `video` as expected) with no console errors.
- Like an item, read the `photo_likes` row back from the database, confirm the count shows and the heart is filled; unlike and confirm the row is gone.
- Confirm the guest surface `/rsvp/$token` renders the same album without errors.
- Delete every test upload/like afterwards and confirm zero leftover rows and zero leftover storage objects.
