## Why Chrome's ⋮ menu has no "Install app"

Chrome only adds the "Install app" menu item (and fires `beforeinstallprompt` so the in-page button works one-tap) when the site has:
1. a web app manifest (we have one), AND
2. a registered service worker with a fetch handler (we do **not** have this).

No service worker → no install option in Chrome's menu, and our button has nothing to trigger, so it falls back to that misleading "tap the ⋮ menu" hint.

## Fix

1. **Add `vite-plugin-pwa`** (`registerType: "autoUpdate"`, `injectRegister: null`, `devOptions.enabled: false`, output `/sw.js`). Runtime caching: `NetworkFirst` for HTML, `CacheFirst` for hashed same-origin assets. Exclude `/~oauth`.
2. **Add `src/pwa-register.ts`** — a guarded registration wrapper that registers `/sw.js` only in production AND only on the real published origins. It refuses (and actively unregisters any stale `/sw.js`) when:
   - not `import.meta.env.PROD`
   - running inside an iframe
   - hostname starts with `id-preview--` / `preview--`, or is on `lovableproject.com` / `lovableproject-dev.com` / `beta.lovable.dev`
   - URL has `?sw=off`
3. **Import it once** from `src/start.ts` (client-only) so it never runs during SSR.
4. **Update `src/components/install-app-button.tsx`**:
   - Android/desktop Chrome: button text "Install app" → calls `deferred.prompt()` → real OS install dialog. One tap.
   - If `beforeinstallprompt` hasn't fired yet (first ~1s after load), show a brief spinner and retry when it arrives. After ~5s with no event, button greys out: "Install not available in this browser." No more "tap the ⋮ menu" copy.
   - iPhone Safari: keep "Add to Home Screen" with the Share-icon one-liner (Apple offers no install API — this is the floor).
   - In-app browsers (Instagram/Facebook/TikTok): keep "Open in Safari/Chrome" one-liner.

## Important caveat

The service worker is intentionally disabled in the Lovable preview iframe and on `*.lovableproject.com` URLs (this is required so the editor never gets stuck on a stale cache). That means in the preview you'll still see "Install not available in this browser." 

**Test on the live site** — https://tasteofconventions.com or https://tasteofconventions-com.lovable.app — after publishing. There:
- Chrome's ⋮ menu will show "Install app".
- Our in-page button will be one-tap.

## Files touched

- `vite.config.ts` — add `VitePWA` plugin
- `package.json` — add `vite-plugin-pwa` + `workbox-window` (via `bun add`)
- `src/pwa-register.ts` — new
- `src/start.ts` — one import line
- `src/components/install-app-button.tsx` — remove stale Android hint, add pending state

No backend, manifest, auth, or routing changes.
