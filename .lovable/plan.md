I can’t force ChromeOS to save a browser download directly to the desktop; Chromebook controls that through its Files app/download settings, and websites are not allowed to choose the final save location.

What I can fix on `/install`:

1. Replace the current one-size download with Chromebook-aware options.
2. Add a primary **Download shortcut image** action that downloads the app icon as a real image file, not just navigates to `/icon-512.png`.
3. Add a **Copy login link** action for `/login?installed=1`, so the user can pair the saved image with the login URL.
4. On Chromebook, show the honest next step: save/move the downloaded icon from **Downloads** to **Desktop** in the Files app, because ChromeOS will not let the website force Desktop as the target.
5. Keep Windows/macOS shortcut file downloads available as secondary options, but stop claiming they can save directly to desktop.
6. Keep the icon itself clickable to open login immediately.

Only `src/routes/install.tsx` changes.