# Restore RSVP totals without exposing server error HTML

## Confirmed current state

- On the authenticated admin/committee dashboard, `getRsvpTotals` returned HTTP 500 and the RSVP totals card displayed the returned HTML error page as red text.
- `getRsvpTotals` is protected and depends on the browser attaching a valid session token before the request reaches the server.
- The hosted backend is healthy; this is an application request/session failure, not a database outage.

## Correction

1. **Reproduce and isolate the protected request failure**
   - Exercise the exact dashboard and signed-in role, then inspect the failed request and server-function log before changing the authentication layer.
   - Verify whether the failure occurs before authorization, during a database query, or during totals calculation.

2. **Make totals wait for authenticated readiness**
   - Do not call `getRsvpTotals` until the authenticated session is available.
   - Retry once after session recovery for a transient missing/expired session instead of leaving the dashboard in an error state.
   - Preserve the existing admin, committee, and guest identity rules and all existing RSVP/referral data.

3. **Return and display safe errors**
   - Ensure a protected server-function failure is surfaced as a short structured error rather than an HTML document.
   - Sanitize the RSVP card fallback so raw HTML can never be rendered in the dashboard.
   - Add a visible Retry control that re-runs the exact database totals read without refreshing the entire page.

4. **Harden the totals server function**
   - Check every invitations, inviters, RSVP, profile, and auth lookup result before calculating totals.
   - Keep the server-function module split-safe by moving runtime helpers out of the server-function declaration file where required.
   - Preserve the canonical party-size, attendance-mode, duplicate-household, First-Loaded Wins, and 550-seat rules.

5. **Verify the numbers from the database**
   - Read back the current invitation and RSVP rows and independently calculate requested, uploaded, in-person, Zoom, pending, and declined totals.
   - Compare those results with the exact values returned by `getRsvpTotals`; do not alter submitted records to make the totals match.

## End-to-end verification

- Test the exact `/admin` dashboard at **384×681 mobile viewport** as the signed-in admin role shown in the screenshot.
- Test both the Admin and Committee dashboard views, including a fresh login and a page reload/session recovery.
- Confirm the request returns JSON with HTTP 200, the totals render, Retry works after a simulated transient failure, and no HTML or technical response body appears in the card.
- Compare the rendered values with database read-back before describing the correction as working.

## Technical files in scope

- `src/components/rsvp-totals-card.tsx`
- `src/lib/rsvp-totals.functions.ts`
- Authentication/function middleware only if the reproduced request proves the session handoff is the failing layer

**Plan update — 2026-08-05 08:39 UTC**