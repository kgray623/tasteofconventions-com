# Photo album: swipeable viewer + comments

Turn the shared photo album into a simple social feed: full-screen viewer with next/previous navigation, and per-photo comments visible under each photo. Nothing outside the photo album is touched (no RSVP, meal, payment, or texting code).

## What you'll see

1. **Viewer navigation** — Open any photo and move with left/right arrows, keyboard arrow keys, or swipe on a phone. Photo counter ("4 of 27"), caption, and who posted it show inside the viewer. Closing is still one tap.
2. **Comments** — Under each photo (both in the viewer and in the feed view) there's a comment list and a box to add one. Your name is filled in automatically from your guest name. Admin and guests can comment; you can delete your own comment, and admin can delete any comment.
3. **Feed layout** — Below the existing upload card, photos render as a feed: image, "Posted by <name>", caption, comment count, and the latest comments. A compact grid toggle stays available so a large album is still easy to scan.

## New database table

`public.photo_comments`
- `photo_id` → references `shared_photos(id)` with cascade delete
- `commenter_name` (text)
- `comment_text` (text)
- `user_id` (owner, from auth)
- standard `id`, `created_at`, `updated_at` + update trigger

Access rules (mirroring the existing photo rules):
- Only signed-in event participants can view comments (same `is_event_participant()` check already used by `shared_photos`).
- A signed-in participant may add a comment only as themselves.
- A person may delete/edit their own comment; admins may delete any comment.
- GRANTs for `authenticated` and `service_role`; no anonymous access.

## Technical details

Files:
- `src/components/shared-photo-album.tsx` — main rework: feed/grid rendering, new `PhotoViewer` state (index-based instead of single URL), keyboard + swipe handlers, comment section wiring. Keeps current upload, signed-URL, owner-delete, and auth-restore logic intact.
- `src/components/photo-comments.tsx` (new) — comment list + add form for one photo, reused in the feed card and the viewer.
- `src/components/photo-viewer.tsx` (new) — dialog-based lightbox: prev/next buttons, index counter, `ArrowLeft`/`ArrowRight`/`Escape` keys, touch swipe via pointer events, caption/uploader header, comments panel.
- One migration creating `photo_comments` with grants, RLS, and policies as above.

Implementation notes:
- Reads/writes go through the existing browser Supabase client with RLS, same as photos today — no new server functions needed.
- Viewer state becomes `activeIndex: number | null`; wrap-around at both ends; signed URLs are already batch-created for all rows so navigation needs no extra fetch.
- Comments load in one query for all visible photos (`in('photo_id', ids)`), grouped client-side, so no N+1 per photo.
- Admin-any-delete uses the existing `has_role(auth.uid(),'admin')` function inside the policy.
- Styling continues the existing gold/berry card language; no design-token changes.

## Verification before reporting done

- Playwright at 390x844 signed in as admin on `/my-rsvp`: open a photo, step forward and back through several photos without closing, confirm counter changes and image `src` changes.
- Post a comment, read it back from the database, confirm it renders under the photo in both feed and viewer, then delete it and confirm zero leftover test rows.
- Repeat the open/next check on `/rsvp/$token` (guest path) to confirm both guest surfaces behave the same.
