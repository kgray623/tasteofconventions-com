# Fix the login so it actually signs you in

2026-08-05 19:05 UTC

## What the logs show (confirmed)

From the auth logs and network capture of your attempts a few minutes ago:

- Your sign-in itself **worked twice** — 19:00:16 and 19:00:34 — and both times the server returned a valid session for Kari Gray, then read your roles (admin, host, team) and your profile successfully.
- Between those two, at 19:00:31, the browser tried to refresh an **older** token and got back `Invalid Refresh Token: Refresh Token Not Found` (400).

So the credentials and the server function are fine. What is failing is the session *staying* signed in in the browser: a stale token gets refused, the app treats that as "signed out", and it silently logs in again from scratch — which mints yet another session and can invalidate the one the page is holding. That churn is what makes a successful login look like "it didn't log me in".

What I have **not** yet confirmed is whether that loop is the whole story, so step 1 of this plan is to reproduce a real login in a browser and watch it, before changing behavior.

## Plan

1. **Reproduce and watch it.** Drive a real login at your phone viewport (384x681) with your last name + phone, and record: the tokens stored, every auth event fired, the route landed on, and whether a second silent login happens. This tells us for certain where it drops.

2. **Stop the silent re-login loop.** In the auth provider, a null session currently triggers an immediate fresh server login. Change it to:
   - Only attempt recovery when there is genuinely no stored session, and never on a token-refresh failure that Supabase can retry itself.
   - Run recovery **once** per page load (single-flight, already partly there) and never in response to a session that was just established.
   - Treat an explicit sign-out as final, so "Log out" is never undone by recovery.

3. **Make a fresh login win.** After a successful sign-in, mark the session as authoritative so the recovery path stands down instead of racing it with another server login.

4. **Keep logging you in on the route you asked for.** No change to the destination logic (admin/team → `/admin`, everyone else → `/my-rsvp`); only the session handling changes.

5. **Nothing is removed.** Remembered phone + last name, the cookie fallback, and the audit trail of every login attempt all stay exactly as they are.

## Verification before I call it fixed

- Real browser login at 384x681, signed in as you, landing on `/admin` with the header showing "Log out".
- Hard refresh on `/admin` — still signed in, no bounce to `/login`.
- Navigate away and back (and simulate returning from the Messages app) — still signed in.
- Confirm in the network log that exactly **one** login call happens per sign-in, and no `refresh_token_not_found` follows it.
- Confirm the audit log recorded the successful attempt.

If any step can't be proven in the browser, I'll say so plainly instead of claiming it works.

## Technical detail

- `src/hooks/use-auth.tsx`: gate `recoverRememberedSession()` on there being no session in Supabase storage; ignore `TOKEN_REFRESHED` failures and post-sign-in null blips; keep `explicitSignOutRequested` sticky through the whole sign-out.
- `src/lib/session-recovery.ts`: add a "session is authoritative" flag set on successful login/`setSession`, checked by the recovery gate.
- `src/routes/login.tsx`: set that flag right after `supabase.auth.setSession` succeeds.
- `src/routes/_authenticated.tsx` and `src/lib/attach-supabase-auth.ts`: left as-is unless step 1 shows they contribute.
- No database migration, no change to `signInWithPhoneOnly` credential rules (username = last name, password = phone number).
