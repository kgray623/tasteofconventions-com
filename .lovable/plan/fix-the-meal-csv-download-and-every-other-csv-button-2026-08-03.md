# Fix the meal CSV download (and every other CSV button)

## What's happening

The "Download CSV" button on the meal/cuisine pre-order report builds the file in the browser and then fakes a click on a hidden link. That technique is unreliable in exactly the situation you're in: viewing the app on a phone, inside the preview frame. Mobile Chrome frequently blocks or silently drops that kind of download, and the code also throws the file away a split second after the click, so nothing lands in Downloads and no error is shown either.

Every CSV button in the admin area uses the same technique (meals/pre-orders, guest list, reconciliation), so all of them are at risk — meals is just the one you pressed.

Note: the exact mobile block is the most likely cause but not yet proven on your device. Step 1 below verifies it before/while the fix goes in, and the fix is safe either way because it removes the fragile path entirely.

## What I'll build

1. **Verify first** — drive the meal report page in a mobile-sized browser, press Download CSV, and capture what the browser actually does (blocked download, no file, or a real file). This confirms the cause rather than assuming it.

2. **A reliable download path, shared by every export**
   - One shared helper used by all CSV buttons.
   - Downloads are handed to the top-level browser tab instead of the embedded frame, so the phone treats it as a normal file download.
   - The file is kept alive long enough for slow mobile downloads to finish.
   - Success and failure both show a clear on-screen message — no more silent nothing.

3. **A guaranteed fallback for phones**
   - If the browser still refuses to download, a panel opens showing the report with:
     - **Copy report** (paste into Notes, Sheets, or a text to the restaurant), and
     - **Open in new tab** so you can long-press and save, or use the phone's Share sheet.
   - This means you can always get the numbers out, even on a locked-down phone browser.

4. **Apply it everywhere** — meals/pre-orders, guest list, and reconciliation exports all switch to the shared helper so this doesn't come back on a different screen.

## Verification before I call it done

- Meal report on a 384px-wide mobile viewport: press Download CSV, confirm a real `.csv` file is produced and its contents match the on-screen totals (per-cuisine counts and grand total).
- Same check on desktop width.
- Confirm the fallback panel opens and the copied text is complete when download is blocked.
- Confirm guest-list and reconciliation CSVs still download correctly.

## Technical details

- New `src/lib/download-file.ts`: `downloadTextFile(filename, text, mime)` — builds the Blob, anchors into `window.top.document` when the app is framed, dispatches a real click, revokes the object URL on a delay, returns a success/failure result.
- `src/routes/_authenticated/admin/preorders.tsx`: replace the inline `exportCsv` blob/anchor code with the helper; on failure open a fallback dialog (existing shadcn `Dialog`) containing the CSV text, a Copy button, and an open-in-new-tab link; add `sonner` toasts.
- Same swap in `src/routes/_authenticated/admin/guests.tsx` and `src/routes/_authenticated/admin/index.tsx` (reconciliation export).
- No database, RLS, or server-function changes; CSV content and column order stay exactly as they are today.
