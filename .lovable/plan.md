I found the actual difference: Wellness Tracker is not doing a special “download image” trick. Its installed desktop/home-screen icon works because its manifest starts the app at `/login?installed=1`, and its install page only shows the desktop button if Chrome exposes the native install prompt. The current Taste app is starting installed icons at `/`, and I added too much fallback instruction text.

Plan:

1. **Make the installed icon open the login page**
   - Update the web app manifest so desktop/home-screen launches go to `/login?installed=1`, matching the Wellness Tracker pattern.
   - Keep the app name/icon as “A Taste of Special Conventions.”

2. **Simplify `/install` to match Wellness Tracker**
   - Remove the Chromebook/desktop instruction block that tells you to hunt through Chrome menus.
   - For desktop/Chromebook, show a simple “Open this page on your phone” message, and only show an “Install on this computer” button if Chrome actually allows the prompt.
   - Keep the phone install instructions for iPhone/Android.

3. **Keep the Install App button simple**
   - If Chrome provides the install prompt, clicking “Install App” opens it.
   - If Chrome does not provide the prompt, clicking it goes to `/install` instead of showing blocked/error wording.

4. **Do not add service workers or offline caching**
   - This remains the same lightweight installable-app setup Wellness Tracker used: manifest + icon + install page.