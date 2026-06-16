I’ll fix the `/install` page so it no longer promises that a plain image can be hyperlinked after it is saved.

Plan:
1. Keep the Taste image visible on the page, and make tapping it open the login page while it is still on the website.
2. Replace the current `Save image` action with a `Save shortcut` action that downloads a real clickable shortcut file pointing to `https://tasteofconventions.com/login`.
3. Keep a separate `Save image only` option if you still need the picture by itself, but label it clearly so it does not imply the saved image will open the site.
4. Remove the confusing install/save prompt behavior from this page.
5. Verify in the preview that the main button downloads the shortcut file and the on-page image links to the login page.