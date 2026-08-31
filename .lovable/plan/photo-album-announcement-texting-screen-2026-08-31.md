# Photo album announcement texting screen

A new admin page at `/admin/album-texts` that works exactly like the covered-dish and Zoom texting screens: one row per guest, a Text button that opens your own Messages app with the message prefilled, and a separate "Mark sent" check so you always know who still needs it.

## Who is on the list

Every guest who attended — both in-person and Zoom — meaning RSVP status `yes` or `maybe`, grouped by committee member who invited them. Declined (`no`) guests are excluded. Guests with no phone on file are still shown, flagged "no phone", never hidden.

Top of the page shows: total guests, texted, still to text, no phone. Sections group by committee member, and there is a "Text all" per group (same behavior as covered dish).

## The message (editable before sending)

Default wording, with `{name}` replaced per guest:

```text
Hi {name} — what a special day at A Taste of Special Conventions!

Our photo & video sharing album is now open. Everyone who was with us, in person or on Zoom, can add their pictures and videos and save everyone else's too.

How to use it:
1. Go to tasteofconventions.com and log in (username = your last name, password = your phone number).
2. At the top of your page you'll see "Share Your Photos."
3. Tap Add photos/videos to upload, tap any photo or video to view it full screen, and tap Save to download it to your phone.
4. You can also like and comment on each other's memories.

720p videos: about 10-15 minutes. 1080p videos: about 5-7 minutes.

Thank you for making this day so encouraging!

Christian love,
Taste of Conventions Committee
```

The wording is editable on the page before you text, same as the other screens.

## Sent tracking

A new `album_text_sends` table records who was texted, when, and which staff member marked it. Marks are only ever set by tapping the check after you send — never automatically from opening Messages. Undo removes the mark.

## Technical details

- Migration: `public.album_text_sends` (`invitation_id` unique FK to `invitations`, `sent_at`, `marked_by`, `marked_by_label`, `updated_at`), GRANTs for `authenticated` + `service_role`, RLS enabled with staff-only policies mirroring `covered_dish_text_sends`.
- `src/lib/album-texts.server.ts` — `loadAlbumTextList` (yes/maybe RSVPs joined to invitations + inviters + sends, grouped by committee member, totals) and `markAlbumTextSent`, both gated by the existing `assertMealStaff`.
- `src/lib/album-texts.functions.ts` — two `createServerFn` endpoints with `requireSupabaseAuth`, same shape as `zoom-texts.functions.ts`.
- `src/lib/album-text.ts` — default template + `{name}` fill, client-safe.
- `src/routes/_authenticated/admin/album-texts.tsx` — page reusing `SmsTextButton`, editable textarea template, per-group Text all, per-row mark/undo, own `head()` metadata.
- Link added to the Steering Committee landing page (`/admin`) with a "still to text" count badge.

Nothing in RSVP, meal, payment, or existing texting code is modified.

## Verification before reporting done

- Playwright at 390x844 signed in as admin on `/admin/album-texts`: confirm totals match a direct database count of yes/maybe RSVPs, confirm rows render grouped by committee member.
- Mark one guest sent, read the `album_text_sends` row back from the database, confirm the UI flips to "Texted"; undo and confirm the row is gone.
- Confirm the `sms:` link body contains the guest's first name and the login instructions, and that no console errors appear.
