## Plan

1. **Stabilize the install prompt state**
   - Update the install helper so it never changes internal install state while React is reading it.
   - This prevents another "Maximum update depth exceeded" loop when the install page renders or refreshes.

2. **Make the Save/Install button behave like Wellness Tracker**
   - Keep the browser-native install/add-to-home-screen flow.
   - If Chrome/Chromebook provides the real install prompt, clicking the button will open that prompt.
   - If the browser cannot provide a prompt, show simple platform instructions instead of failing or pretending to download to a fixed place.

3. **Remove the confusing toast-only fallback**
   - Replace the vague "Use your browser menu" toast with visible instructions on the page so the user knows exactly what to tap/click next.

4. **Verify the install page**
   - Check `/install` loads without the React error.
   - Check clicking Save/Install no longer crashes and either opens the native prompt when available or shows the fallback instructions.