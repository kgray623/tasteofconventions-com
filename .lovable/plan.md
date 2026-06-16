I’ll fix this by making the install button work from the app instead of sending you to Chrome menu instructions.

Plan:
1. Add a single global install-prompt listener near app startup so Chrome’s install event is captured as soon as it appears, not only after the admin dashboard renders.
2. Update the admin Install App button to use that saved prompt directly, so clicking it opens Chrome’s native install dialog on Chromebook when the app is eligible.
3. Remove the “Install with Chrome” fallback instructions from that button because they are not helping.
4. Improve the install state so the button stays simple:
   - “Install App” when ready
   - “Preparing Install…” briefly while Chrome is still checking the app
   - a plain message only if Chrome/browser policy blocks installation
5. Verify the PWA setup still has the required manifest, icons, standalone display mode, service worker registration, and published-domain-safe behavior.

Important browser limit: Chrome will still require the final native confirmation dialog after the button is clicked; websites are not allowed to install silently without that browser confirmation.