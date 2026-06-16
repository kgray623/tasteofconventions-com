Update `InstallAppButton` in `src/components/install-app-button.tsx`:

- Replace the `Download` lucide icon with an `<img src="/icon-192.png" />` of the actual app icon.
- Render it as a small rounded square (≈20px) to the left of the text.
- Keep the button label "Download the app", terracotta background, and existing install/iOS-sheet behavior unchanged.

No other files change.
