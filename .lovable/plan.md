# Photo album texts: make the existing page work on the live site

No new system. `/admin/album-texts` already exists and works exactly like the invite, RSVP, covered-dish and Burmese texting pages: one row per guest, Text button that opens your own Messages app with your saved message, and Mark sent / Undo. Your saved wording — including the Indonesia social-media reminder — is intact in the database.

The only real problem: it is not showing up for you on the live site. That is the same stale-published-build issue we hit before.

## Steps

1. **Confirm the page is complete as-is** (no rebuild): flat list of the 246 phone numbers, header showing 247 in person / 129 Zoom / 376 people total / 246 phone numbers to text, Text + Mark sent / Undo wired to `album_text_sends`.

2. **Keep the Indonesia reminder permanent.** Your saved message already has it. I will also put that same Indonesia sentence into the built-in default wording in `src/lib/album-text.ts`, so it can never be lost if the message is ever reset. Your saved version keeps priority and is not overwritten.

3. **Make it reachable where you actually use it.** Verify the "Photo album texts" entry with its count badge appears in the committee/admin menu for your account, and that the page loads at phone width on the live domain.

4. **Publish a fresh build** with cache busting so tasteofconventions.com serves the current version, then load the live page on a phone-width browser and confirm: the menu entry is visible, tapping Text opens Messages with the message prefilled, and Mark sent records and reads back from the database.

## What I will not touch

RSVP, meal, payment, waiting-list or existing texting pages. No new tables. No wording changes to your saved album message.
