I found the Wellness Tracker setup. It did not use a custom “download to desktop” page as the main path — it used normal web-app install metadata so the browser/phone shows the built-in save/install/add-to-screen options.

Plan:
1. Replace the current `/install` page behavior with the Wellness Tracker-style app install flow:
   - Restore a clear “Save / install this app” button that uses the browser’s native install prompt when Chrome/Chromebook supports it.
   - Keep iPhone/iPad guidance for Add to Home Screen, because Apple does not expose a one-click install prompt to websites.
   - Keep a simple fallback link to login.

2. Match the Wellness Tracker manifest pattern:
   - Use a standard manifest file path/name if needed.
   - Keep `start_url` pointed at `/login?installed=1`.
   - Keep `display: "standalone"`, app icons, theme color, and portrait orientation.
   - Ensure icons are declared in the same broad-compatible way Wellness Tracker used.

3. Keep the existing head tags that make phone/tablet screen icons work:
   - manifest link
   - theme color
   - Apple touch icon
   - mobile web app capable tags

4. Remove the misleading Chromebook “download image then drag it” workflow from the main experience, because that is not what Wellness Tracker did.

5. Verify the `/install` page shows the native-install path and that the manifest still points to the login page after install.