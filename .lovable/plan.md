## Goal
Remove the duplicate "Add one guest" and "Upload your guest list" cards from `/admin/upload` because the top "Add guests" card already provides the same functionality.

## Plan

### 1. Consolidate the upload page (`src/routes/_authenticated/admin/upload.tsx`)
- Keep the top **"Add guests"** card (quick-add + screenshot + spreadsheet labels).
- Move the actual `<input type="file">` elements for screenshots and spreadsheets into the top card so the existing labels work.
- Add `ref={quickNameRef}` to the top name input so the post-add focus behavior is preserved.
- Remove the entire lower **"Add one guest"** card.
- Remove the entire lower **"Upload your guest list"** card.
- Keep the **"Sample message"** card and the stats/RSVP cards above it untouched.

### 2. Verify
- Run TypeScript type check (`tsgo --noEmit`).
- Use Playwright to open `/admin/upload`, confirm only one add/upload section exists, and verify the file inputs still trigger correctly.

## What will change for the user
The `/admin/upload` page will show one clean "Add guests" section at the top instead of the duplicated forms below it. No functionality is lost — quick-add, screenshot upload, and spreadsheet upload will all still work from the top card.