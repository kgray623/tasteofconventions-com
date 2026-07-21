2026-07-21 17:45 UTC — Plan to stop the broken refresh/link behavior:

1. **Confirm the route and link source**
   - Inspect the admin navigation and guest-filter links that point to `/admin/guests`.
   - Check whether any links are copying the full preview URL or preserving Lovable preview-only query params like `__lovable_sha`.

2. **Make admin links route-safe**
   - Update internal navigation to use TanStack Router links/navigation only, with a clean search object such as `status=confirmed`.
   - Ensure links do not include the preview host, custom domain host, published host, or preview-only query strings.

3. **Provide stable external links**
   - Add or document clean links for the admin dashboard, committee dashboard, and guest/dashboard flows using the published/custom domain instead of the temporary preview domain.
   - Keep authenticated/admin pages behind login, but make the URLs themselves stable and refreshable.

4. **Mobile verification**
   - Test the exact mobile route `/admin/guests?status=confirmed` after login.
   - Refresh it multiple times and verify it stays on the admin guests page instead of opening the Android “webpage not available” error.

5. **Report back with the exact working links**
   - Give you the clean admin, committee, and guest links after verification, and explicitly say if anything cannot be fully verified in this environment.