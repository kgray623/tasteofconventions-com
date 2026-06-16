## Goal

Make Install App work like the Wellness Tracker: one button that either installs natively (Chrome on Chromebook / Android / desktop) or shows clear platform-specific steps (iOS Safari). No more "Chrome blocked the install prompt" dead-end message.

## What's actually happening (plain English)

Chrome only offers its one-click native install **once per site per device**. If you (or anyone on that Chromebook) ever clicked the X on Chrome's install bubble, or installed-then-uninstalled, Chrome silently refuses to fire the native prompt again for ~90 days. **No website code can override that** — not ours, not the Wellness Tracker's. The Wellness Tracker isn't doing anything magic; it works for you there because you never dismissed it on that site. Its code path for "no native prompt available" is identical to ours: show instructions.

So the fix isn't "make the prompt work every time" (impossible). The fix is to match what Wellness Tracker actually does: a friendly, always-useful page with the right instructions for each device, and the native button when the browser allows it.

## Changes

**1. New route `/install`** (`src/routes/install.tsx`)
Mirror the Wellness Tracker layout:
- Detects platform: iOS, Android, Desktop/Chromebook.
- Shows "You're already using the installed app" if launched standalone.
- iOS → Safari Share → Add to Home Screen steps.
- Android → native "Install app now" button if available; otherwise Chrome ⋮ menu → Add to Home screen steps.
- Desktop/Chromebook → native "Install on this computer" button if available; otherwise instructions: address-bar install icon, or Chrome ⋮ → Cast, save, and share → Install page as app.
- "Why install?" section at bottom.
- head() with proper title/meta.

**2. Simplify `src/components/install-app-button.tsx`**
- If the native prompt is captured, clicking installs immediately (current behavior, kept).
- If not, instead of opening the "blocked" sheet, the button navigates to `/install` where the user always sees actionable instructions for their device.
- Remove the "Chrome blocked the install prompt" wording entirely.

**3. No changes** to `pwa-install.ts`, `pwa-register.ts`, `manifest.webmanifest`, or the service worker — those are already correct and verified live.

## Technical notes

- `/install` route uses `createFileRoute('/install')`, client-only detection in `useEffect` (SSR-safe).
- Reuses `getInstallPromptSnapshot`, `subscribeToInstallPrompt`, `promptToInstallApp`, `isStandaloneApp` from `src/pwa-install.ts`.
- Frontend-only; no backend, no schema, no new packages.
- Requires **Publish → Update** to test on tasteofconventions.com (service worker / install behavior does not work inside the Lovable preview iframe).

## Honest expectations

- On a Chromebook where Chrome has **not** previously dismissed install for this site: button installs in one click.
- On a Chromebook where Chrome **has** dismissed it: button takes you to `/install`, you click ⋮ → Cast, save, and share → Install page as app. That is the same path the Wellness Tracker users follow when their prompt is gone — it's just hidden behind a friendlier page instead of an error.
