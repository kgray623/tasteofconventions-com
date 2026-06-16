Plan: make this work like a simple saved shortcut image, not a complicated install flow.

What I will change:
1. Replace the current `/install` page with one simple screen:
   - Show the Taste app image/icon.
   - A button to save/download that image file.
   - The image links directly to `/login` when tapped inside the page.
   - Minimal wording only; no long platform instructions.

2. Remove the broken/confusing install prompt behavior from that page:
   - No “Save or install app” browser prompt button.
   - No fallback instruction boxes.
   - No repeated install-state React subscription on this screen.

3. Keep the existing website manifest/icon support in place:
   - If someone uses browser “Add to Home Screen,” it can still open the login page.
   - But the visible user flow will be the shortcut-image download, as requested.

4. Verify `/install` opens cleanly and the download link points to the image file.