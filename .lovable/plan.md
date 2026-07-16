## Fix guest RSVP page (`/rsvp/:token`)

I was editing the wrong file — my last change went to `my-rsvp-content.tsx` (the signed-in "My RSVP" view). The guest-facing form lives in `src/routes/rsvp.$token.tsx`. That's why you didn't see the photos and still see the identity block.

### Changes to `src/routes/rsvp.$token.tsx`

1. **Delete the top "Your name and mobile number" Card entirely** (lines ~263–296).
   - Also remove the `guestName`/`guestPhone` validation at lines 172–173.
   - Keep the state variables — they're already prefilled from the invitation record and still sent on submit, so guest identity is never dropped from the DB.

2. **Delete the "Hello, {guest_name}" line** (line 301). Nothing replaces it — the invitation title stays.

3. **Add photos + Myanmar note** to the cuisine list (line 240):
   ```
   { key: "Myanmar", label: "Myanmar/Burmese", note: "Photos coming next week" },
   { key: "African", label: "African", photos: africanPhotos },
   { key: "Indonesian", label: "Indonesian", photos: indonesianPhotos },
   ```
   Import the 6 existing `.asset.json` files (African + Indonesian) already uploaded to `src/assets/`.

4. **Render inside each cuisine card** (after line 613 label / before the Yes/No buttons block, inside the row):
   - If `cuisine.photos`: 3-column thumbnail grid, each opens a lightbox `Dialog` (same pattern as `my-rsvp-content.tsx`).
   - If `cuisine.note`: small italic muted line ("Photos coming next week").

5. **Add `lightbox` state + `Dialog`** (mirrors `my-rsvp-content.tsx`).

### Not touched
- Submit / DB write — guest name + phone still saved from prefilled state.
- Meal-count logic, totals, invitation page, `/my-rsvp`, admin views.

### Verification
- Reload `/rsvp/:token` at 384px width:
  - No "Your name and mobile number" card at top
  - No "Hello, …" line
  - Myanmar row shows "Photos coming next week"
  - African + Indonesian rows show 3 thumbnails each; tapping opens lightbox
- Submit RSVP → confirm `invitations.guest_name` and `guest_phone` unchanged in DB (values persist from prefill).

Timestamp: 2026-07-16 UTC
