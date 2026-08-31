# Album text page: keep Indonesia reminder, correct numbers, usable from the public side

## What stays exactly as you set it

- Your saved album message (with the Indonesia line: "Please don't share on social media any Indonesia segment pictures from the videos for the safety of friends there from banned countries") is still in the database, saved at 20:03 UTC Aug 31. **It will not be overwritten.** Nothing in this change touches that saved wording.
- The confirmed header numbers stay: **247 in person · 129 Zoom · 376 people total · 246 phone numbers to text.**

## Changes

1. **Bake the Indonesia reminder into the built-in default wording** (`src/lib/album-text.ts`), so if the saved message is ever reset, the default still contains the same Indonesia social-media reminder and your current login-instructions wording. This only changes the fallback default — your saved message keeps priority.

2. **Make the album visible and working on the public side.**
   - Show the "Share Your Photos" album on the public homepage (`src/components/invitation-page.tsx`) for anyone who is signed in — guests and you as admin — so nobody needs their personal RSVP link to upload, view, like, comment, or save photos/videos.
   - Signed-out visitors see the page unchanged (no album, no sign-in wall added).

3. **Make the texting page reachable and make texting work from a computer too.**
   - The "Photo album texts" entry on the Admin overview already links to `/admin/album-texts`; verify the link and badge work end-to-end.
   - Add a desktop fallback to the Text buttons (`src/components/sms-text-button.tsx`): on a computer where `sms:` links do nothing, tapping Text copies the full message and phone number to the clipboard and says so, so it can be pasted into Google Voice/WhatsApp/etc. On phones it still opens Messages directly.

## Verification

- Database read-back: saved album template still contains the Indonesia sentence after the change; RSVP rollup still returns 247 / 129 / 376 / 246.
- Playwright at phone width (390px) signed in as admin: homepage shows the album, `/admin/album-texts` shows the four counts and the Indonesia sentence in the message wording, and Text buttons produce either an `sms:` link or a clipboard copy.
- Then publish so the live site has it.
