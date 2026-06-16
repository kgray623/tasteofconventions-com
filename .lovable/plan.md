## Why "Install App" isn't opening Chrome's prompt

Everything on the site side is correct — manifest, icons, service worker, HTTPS, standalone display. I verified on the live domain. The reason Chrome is silent is **device-side**, not site-side:

- Chrome only fires its native install prompt once per site per device. Once you (or anyone on this Chromebook) dismissed it or installed+removed the app, Chrome puts the site on a cooldown of roughly 90 days.
- No website code can re-trigger that prompt during the cooldown. This is a hard browser rule — Google designed it that way to stop sites from nagging.

That's why the button now shows "Chrome blocked the install prompt." It's accurate, but the follow-up steps I gave you for the ⋮ menu were wrong for current ChromeOS, which is why nothing happened when you tried them.

## What I'll change

Make the button do the right thing **without** relying on Chrome's blocked prompt, and give correct, current ChromeOS instructions as the fallback.

### 1. Button behavior

- When `beforeinstallprompt` is available, clicking installs natively (already works).
- When Chrome has blocked it (your case), the button still opens a help sheet — but with the **correct** ChromeOS menu path, not the old wording.

### 2. New "blocked" help sheet wording

Replace the current blocked modal with two clear options the user can actually follow on a Chromebook:

```text
Install A Taste on your Chromebook

Option 1 — Address bar
  Look at the right edge of Chrome's address bar for a small
  computer-with-down-arrow icon. Click it, then click Install.

Option 2 — Chrome menu (use this if the icon isn't there)
  Click the ⋮ menu (top-right of Chrome)
  → Cast, save, and share
  → Install page as app…
  → Install

If neither option appears
  Chrome has remembered a previous dismissal for this site.
  Click ⋮ → Settings → Privacy and security → Site settings
  → View permissions and data stored across sites
  → search "tasteofconventions" → Delete data.
  Then reload this page and try Install App again.
```

The third block is the only thing that actually un-sticks Chrome's cooldown on a Chromebook.

### 3. Keep the existing iOS/Safari and in-app-browser flows

Those already work and aren't part of this complaint.

## Technical notes

- Edit only `src/components/install-app-button.tsx`. No changes to `pwa-install.ts`, `pwa-register.ts`, manifest, or service worker — those are already correct and verified on the live site.
- No new dependencies, no new files, no schema changes.
- After the edit, the change is frontend-only, so it requires a **Publish → Update** before you'll see it on tasteofconventions.com.

## What this won't do

No website is allowed to silently install itself, and no website can override Chrome's per-site cooldown on the install prompt. The browser owns that decision. The fix above is the most direct path that actually works on a Chromebook today.