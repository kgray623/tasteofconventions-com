## Plan to stop the repeated kick-outs

1. **Make session recovery reliable**
   - Update the login/session recovery storage so it remembers both required credentials: last name + phone number.
   - Right now the recovery path can have a phone but no name, which means it cannot rebuild the session after the browser auth cache drops.

2. **Prevent false redirects to login**
   - Adjust the protected-route guard so it waits for either a valid session or recoverable login credentials before redirecting.
   - If recovery is in progress, keep the user on the protected page with a loading state instead of bouncing them out.

3. **Keep sign-out intentional only**
   - Preserve the explicit logout behavior so pressing “Log out” still clears the remembered credentials and sends the user out.
   - Do not clear remembered credentials for temporary session loss, tab wake, mobile refresh, or backend token refresh delay.

4. **Harden authenticated server calls**
   - Update the auth header middleware so protected server functions wait for recovery/refresh before sending a request without a bearer token.
   - This prevents a temporary missing token from cascading into 401s that make the UI look logged out.

5. **Verify on the actual protected route**
   - Log in with the existing last-name + phone flow.
   - Open the admin/committee dashboard, refresh, and confirm it stays signed in.
   - Confirm Log out still actually logs out.

**Timestamp:** 2026-07-30 03:36 UTC