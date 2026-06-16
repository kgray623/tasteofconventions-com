## Goal
Show one install button, but its label and behavior adapt to the device. No numbered 3-step list anywhere.

## Behavior

**Android (Chrome / Edge / Samsung Internet)**
- Button label: "Install app"
- Tap → fires the native `beforeinstallprompt` (already wired). One tap, OS prompt appears, done.
- If the prompt isn't available yet (browser hasn't fired the event), button shows "Install app" and tapping it shows a one-line hint: "Tap the ⋮ menu → Install app."

**iPhone / iPad Safari**
- Button label: "Add to Home Screen"
- Tap → opens a small popover anchored to the button with one sentence and a visual: "Tap the Share icon ⬆ at the bottom of Safari, then 'Add to Home Screen.'"
- Popover shows the iOS Share glyph + an arrow pointing toward the Safari toolbar. Auto-dismisses on tap-outside.
- This is the closest to one tap iOS allows — Apple does not expose any API to trigger Add to Home Screen programmatically.

**In-app browsers (Instagram, Facebook, TikTok webview)**
- Button label: "Open in Safari" (iOS) or "Open in Chrome" (Android)
- Tap → one-line hint: "Tap the ⋯ menu and choose 'Open in Safari/Chrome' to install."

**Already installed (standalone display-mode)**
- Button hidden.

## File to edit
- `src/components/install-app-button.tsx` — replace the current 3-step instruction block with the platform-branched UX above. Keep button styling, position, and the existing Android `beforeinstallprompt` handler.

## Out of scope
- No manifest changes, no service worker changes, no backend changes.
- No copy changes outside this one component.
