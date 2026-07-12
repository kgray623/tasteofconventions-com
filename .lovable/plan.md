## Plan

1. **Add a global mobile scroll foundation**
   - Set the root document/app surface to allow vertical touch scrolling explicitly.
   - Add `-webkit-overflow-scrolling: touch`, `touch-action: pan-y`, and stable min-height rules so phone drag gestures scroll the page instead of being ignored.

2. **Protect against preview/editor toolbar overlap**
   - Keep the admin mobile bottom spacing already added.
   - Extend the same bottom safe-area padding to the authenticated/admin content surface if needed, so the Lovable mobile toolbar cannot hide the last content.

3. **Remove mobile nested-scroll traps where they still exist**
   - Re-scan admin and committee pages for any remaining mobile `overflow-auto`, `overflow-y-auto`, `max-h`, or fixed-height list containers that could capture touch gestures.
   - Change only mobile behavior; keep desktop capped-scroll lists unchanged.

4. **Verify with touch behavior, not only programmatic scroll**
   - Test the exact mobile viewport: 384×673.
   - Use Playwright mobile/touch settings and perform a drag gesture on `/admin?view=committee` and `/admin/upload?view=committee`.
   - Confirm `document.documentElement.scrollTop` changes after the drag and screenshot the bottom of each page.

5. **No data/business logic changes**
   - Do not change RSVP totals, quotas, Send text, guest records, routes, roles, or database logic.