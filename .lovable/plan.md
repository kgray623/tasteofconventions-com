# Fix mobile "Choose Screenshots" + page freeze on /admin/upload

## What's broken (root cause)

**1. "Choose screenshots" button does nothing on mobile.**
Today the orange button is a `<Button>` whose `onClick` calls `screenshotRef.current?.click()` on a hidden `<input type="file">` somewhere else in the DOM. On mobile Safari/Chrome — especially inside the Lovable preview iframe — that programmatic `.click()` is treated as a non-user gesture and the system picker silently refuses to open. The desktop browser is more forgiving, which is why this only fails on the phone. The "Choose spreadsheet" button has the exact same shape and will fail the same way on mobile; I'll fix it too while I'm there.

**2. Chat / microphone / refresh "freezing".**
After tapping the dead screenshot button, the page is left in a half-state: the iOS file-picker intent partially fires, the AI extract call (`extractContactsFromImages`) can hang with no timeout, and `screenshotBusy` stays `true` — so the button stays disabled, the chat tab and notification bell stop responding to taps, and pull-to-refresh feels stuck. Adding a hard timeout + always resetting `screenshotBusy` in `finally` (already there, but the network call itself has no ceiling) stops the page from locking up.

## Changes (frontend only — no business logic, no DB, no auth)

**File: `src/routes/_authenticated/admin/upload.tsx`**

1. **Replace the programmatic-click pattern with a real label** for both file pickers (screenshots and spreadsheet). The visible orange control becomes a `<label htmlFor="...">` styled exactly like the current `Button` (same `bg-terracotta text-cream`, same width, same min-height for tap target), and the `<input type="file">` keeps `className="sr-only"` (not `hidden`, so the label/for association actually drives it). This is the only reliable way to open the native picker on iOS/Android inside an iframe — the tap on the label IS the user gesture that opens the picker, no JS hop in between. Keep the existing `ref` so we can still clear `.value` after upload.

2. **Wrap `extractContacts({ data: { images } })` in a 60-second timeout** using the existing `withTimeout` helper from `@/lib/async-safety`. If the AI call hangs, the user gets a clear toast ("That took too long — try fewer screenshots") instead of a frozen page. `screenshotBusy` is already reset in `finally` — keep that.

3. **Defensive: also reset `screenshotBusy` on the `onChange` early-return paths** (no files, too many files, no event). Today if the user opens the picker and cancels, nothing fires — fine — but if they pick >10 files we toast and return without ever having flipped the busy flag, which is correct already. No change needed; just verifying after the refactor.

4. **No changes** to: the AI server function, the DB inserts, the duplicate-flag query, the saved-guests reload, the committee/quota logic, or any other button on the page.

## Verification before calling it done

Run from inside the sandbox using Playwright against `http://localhost:8080` with a mobile viewport (390×844, iPhone UA):

1. Restore the Supabase session, navigate to `/admin/upload`.
2. Tap the orange "Choose screenshots" label → assert the hidden `<input type="file">` receives a `click` event (Playwright `filechooser` event fires). Screenshot.
3. Attach a 1-pixel PNG via `page.set_input_files`, wait for the toast, confirm `screenshotBusy` resets and the button re-enables. Screenshot.
4. Tap the notification bell and the chat tab afterward → assert they respond (panel opens / route changes). Screenshot.
5. Repeat step 2 for "Choose spreadsheet".

If any single tap doesn't respond, it is NOT fixed and I keep iterating.

## Out of scope (will not touch)

- Phyllis Andrews / guest counts / RSVP totals (already verified correct in earlier turn).
- Login, session, role checks.
- `extractContactsFromImages` server function.
- Any other admin page.
