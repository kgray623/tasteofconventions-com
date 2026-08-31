# Fix wrong "Posted by" name in the shared album

Timestamp: 2026-08-31 19:50 UTC

## What actually happened (verified in the database)

Your video and 4 photos are stored under your account (uploaded_by = Kari Gray),
but they were labeled **Stephanie Orea**. Confirmed rows:

- 5 items created 2026-08-31 19:06–19:25 UTC: uploaded_by = Kari Gray, guest_name = "Stephanie Orea"
- One earlier item at 19:02 UTC is correctly labeled "Kari Gray"

Cause: the album labels an upload with the name of the invitation page it is
rendered on, not the person who is signed in. On `/rsvp/<token>` that token
belonged to Stephanie Orea, so anything uploaded from that page got her name —
even though you were signed in as yourself.

Note: your account's display name is stored as "Kari Gray". If it should read
differently (e.g. "Kari Samson"), say the exact spelling and it gets corrected too.

## The fix

1. Signed-in uploads use the signed-in person's own name, never the invitation
   name of whatever page they're viewing. Only guests who are not signed in
   (opening a private invitation link) fall back to that invitation's name.
2. Backfill the 5 mislabeled rows: change guest_name from "Stephanie Orea" to
   your correct name. Nothing is deleted; the media and captions stay.
3. Verify by database read-back plus a preview check of the album that the
   video now reads "Posted by Kari Gray" and no other rows changed.

## Technical detail

- `src/components/shared-photo-album.tsx` currently uses only the `guestName`
  prop for the insert. It will resolve the poster name in priority order:
  signed-in profile display name (via the current session) → committee/inviter
  name → invitation prop → "Guest".
- Backfill via a targeted SQL update limited to the 5 row ids above
  (uploaded_by = your user id AND guest_name = 'Stephanie Orea').
- No changes to RSVP, meal, payment, or texting code.
