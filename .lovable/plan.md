Implement the install flow like the working app pattern, without extra instruction clutter:

1. **Make the app actually installable in Chrome**
   - Keep the manifest and app icons.
   - Ensure the service worker setup is valid on the published site, because Chrome desktop/Android often will not show the native install prompt unless the site is installable.
   - Keep the service worker guarded so it does not run in Lovable preview/dev.

2. **Installed icon opens the login page**
   - Keep `start_url` pointed at `/login?installed=1` so the saved desktop/home-screen icon launches straight into the login page.

3. **Replace the current `/install` page with a direct install page**
   - Top action: show an **Install App** button when Chrome/Android exposes the native prompt.
   - iPhone/iPad: show only the Safari Share → Add to Home Screen steps, since iOS does not provide a web install button.
   - Desktop/Chromebook/Android without prompt: show short browser-specific fallback steps for saving the app icon, not the current “open this page on your phone” dead end.

4. **Keep the header Install App button simple**
   - If install prompt exists, click opens the browser install prompt.
   - Otherwise it opens `/install` for the right device-specific steps.

5. **Verify**
   - Check that `/install` renders in preview.
   - Check that the manifest still loads and points installed app launches to `/login?installed=1`.

Technical notes:
- No database changes.
- No changes to login behavior.
- No new offline feature promises; this is only to satisfy Chrome installability and home-screen/desktop app icons.