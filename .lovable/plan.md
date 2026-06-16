Change only `src/routes/install.tsx` to match the wellness-tracker style request:

1. Remove the install-app prompt/button and all phone/Android/desktop install instructions.
2. Show the app image/icon prominently with one action to save/download it to the desktop.
3. Make the saved shortcut point to `/login?installed=1` by providing a small downloadable desktop shortcut file that uses the app icon and opens the login page.
4. Keep a clear clickable image on the page that also takes users directly to `/login?installed=1`.
5. Keep the Back link.

No backend changes. No service worker/offline changes. No install app button.