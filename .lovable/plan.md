Do I know what the issue is? Yes.

The `/install` page is crashing because `src/pwa-install.ts` uses `useSyncExternalStore`, but `getInstallPromptSnapshot()` returns a brand-new object every time (`{ ...state }`). React requires that snapshot to be cached/stable unless the store actually changes. Because it changes on every read, React keeps re-rendering until it hits “Maximum update depth exceeded.”

Plan:
1. Fix `src/pwa-install.ts` so the install prompt snapshot is cached and only changes when the install state actually changes.
2. Keep the current Wellness Tracker-style native save/install behavior intact: no custom desktop download workflow, still using the browser’s real install/add-to-home-screen flow.
3. Verify `/install` loads without the error and that the Save/Open Login controls still render.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>