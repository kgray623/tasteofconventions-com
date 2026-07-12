## Plan

1. **Make the admin page usable above the mobile preview toolbar**
   - Add mobile-only bottom spacing to the admin layout container so the last tabs and page content are not hidden behind the Lovable preview controls shown in the screenshot.
   - Use safe-area spacing so it behaves correctly on phones with gesture/navigation bars.

2. **Improve the mobile admin header/tabs layout**
   - Keep the heading and Upload guests button responsive so they don’t crowd the top of the page.
   - Keep the existing admin and committee tabs, routes, labels, counts, and permissions unchanged.

3. **Do not change RSVP data or counts**
   - No RSVP quota logic, RSVP totals, Send text behavior, guest data, or database logic will be changed.

4. **Verify on the exact mobile size**
   - Test `/admin?view=committee` at the 384×673 mobile viewport.
   - Confirm the page can scroll to the bottom and the lower tabs/content are reachable without being covered.
   - If authenticated preview access is not available in the test environment, I’ll state that explicitly and verify the source/layout behavior I can.