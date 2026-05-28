## Plan to fix the login loop

1. **Stop the redirect loop after phone sign-in**
   - Replace the hard `window.location.replace(...)` redirects in the login flow with TanStack Router navigation.
   - Keep the session in the same app runtime so the protected `/admin` route can immediately see the signed-in user instead of reloading and falling back to `/login`.

2. **Make protected-route auth wait for session restoration**
   - Update the authenticated layout so it does not send users back to `/login` while the browser is still restoring the newly set session.
   - Re-check the authenticated user before redirecting away.

3. **Preserve the intended destination**
   - If someone logs in from `/login?redirect=/admin`, send admins/team users to `/admin` and regular guests to `/my-rsvp`.
   - Keep the existing `/admin/upload` exception working.

4. **Verify the exact failure path**
   - Confirm the phone-login server function still returns a valid session.
   - Confirm the login page no longer lands back on `/login?redirect=/admin` after a successful phone number sign-in.

## Technical files to update

- `src/routes/login.tsx`
- `src/routes/_authenticated.tsx`

I will not change the phone-only login model or reintroduce passwords.