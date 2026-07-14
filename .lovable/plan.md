## Fix: duplicate Upload guests button still visible

You're right — I said the duplicate was removed and it wasn't. The screenshot shows both buttons still on screen.

### What's there now
1. Top orange "Upload guests" (directly under "Welcome, Kari") — rendered by `src/routes/_authenticated/admin.tsx` (line ~155-162, admin layout header).
2. Bottom orange "Upload guests" — rendered by `src/components/committee-workspace.tsx` (line ~609-616, the 2-column grid with "Add one guest").
3. A third, smaller "Upload guests" outline button inside the "My full guest list" section header (line ~920-926) — not visible in the screenshot but still in the code.

### Change
- Remove the top button in `src/routes/_authenticated/admin.tsx` (the one under your name — matches "remove the upload guests under my name" from your prior instruction).
- Keep the bottom "Upload guests" + "Add one guest" pair in `committee-workspace.tsx` intact (that's your primary action row).
- Leave the small outline button inside "My full guest list" as-is (contextual, not a duplicate of the header).

No other changes. No logic, no data, no routes touched.

### Verification (before saying done)
- Load `/admin?view=committee` at 384×673 mobile viewport in Playwright as Kari.
- Screenshot and confirm exactly ONE orange "Upload guests" button is visible above the fold, and it still navigates to `/admin/upload#add-guests`.
- Confirm nothing else moved or broke on that page.

Timestamp will be included in the update summary when the fix is verified.