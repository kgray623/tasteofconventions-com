# Correct Kari Gray’s album comments and likes permanently

Timestamp: 2026-09-02 12:15 UTC

## Verified problem

The screenshot is accurate. The database currently contains:

- **2 comments** written by Kari Gray’s authenticated account but stored as **Stephanie Orea**, including “Thank you for filming the food, so yummy!” at 12:10 UTC today.
- **81 likes** from Kari Gray’s authenticated account also stored as **Stephanie Orea**.
- Kari’s profile record correctly says **Kari Gray**.

The earlier client change only changed the name chosen for future browser inserts. It did **not** correct existing comment/like rows and the database still accepts a browser-supplied wrong name. That is insufficient.

## Correction

1. Add a database trigger for album comments and likes that derives the stored name from the authenticated `user_id`’s profile on every insert/update. The invitation-page name will no longer be trusted for signed-in activity.
2. Backfill all mismatched album comments and likes by Kari’s exact user ID from the authoritative profile name:
   - 2 comment labels: Stephanie Orea → Kari Gray
   - 81 like labels: Stephanie Orea → Kari Gray
3. Keep every comment, like, photo, video, caption, timestamp, and ownership record intact; change only the incorrect denormalized name labels.
4. Retain the client-side profile-name resolver as an immediate UI safeguard, while the database trigger becomes the authoritative forward protection.

## Verification

- Read the database back and require zero Kari comment/like rows whose stored label differs from `profiles.display_name`.
- Verify the exact pictured comment displays **Kari Gray** on the RSVP album route at the mobile viewport shown in the screenshot.
- While signed in as Kari and viewing another person’s invitation URL, add a temporary test comment and like; verify both database rows and rendered labels say **Kari Gray**, then remove only the temporary test records.
- Check that the original comment text and all 81 likes remain present.

## Technical scope

- One additive database migration for the trigger, trigger function, and targeted backfill.
- Album comment/like identity handling only; no changes to uploads, RSVP, meals, payments, texting, or unrelated user information.
