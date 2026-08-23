# Make the one-page unpaid guest ledger reliable for every committee member

## Current verified status

- The published **Unpaid guests** link navigates to `/admin/unpaid` on a 390×844 mobile viewport.
- The dedicated page hides the general guest header and RSVP/filter tabs as intended.
- The code currently allows both admins and committee/team members to request the committee-wide `scope: "all"` ledger.
- However, the latest signed-in production test remained on **“Reading payment status from the database…”** and did not render the committee groups. Therefore the page is **not yet verified ready**.

## Execution plan

1. Reproduce the published loading failure while capturing the server-function request, response, browser error, authenticated role, and final route.
2. Trace the exact `/admin/unpaid` chain end to end:
   - signed-in admin or committee identity
   - `useMyUnpaidMeals`
   - `getMyMealTexts({ scope: "all" })`
   - staff authorization
   - committee-wide invitations, meal orders, and payment ledger
   - grouped rows returned to the page
3. Correct only the failing boundary so both `admin` and `team` roles receive the same complete committee-wide unpaid ledger. Preserve all existing meal, payment, RSVP-no, and Zoom exclusions.
4. Query the live database and record the expected unpaid household, order-line, plate, and committee-group counts before UI verification.
5. Verify the published site at 390×844 for both roles:
   - Admin: one tap on **Unpaid guests** opens `/admin/unpaid` and renders all groups.
   - Committee member: the same link opens the same route and renders the same committee-wide groups.
   - The banner and first group are visible without scrolling.
   - No general guest header, RSVP tabs, or attendance tabs appear.
   - Names, phones, cuisines, exact owed amounts, and inviter groupings match database read-back.
6. Report the UTC timestamp, published commit/bundle identity, database counts, role-by-role results, and production screenshots. If either role cannot be fully tested, state that explicitly rather than calling it ready.

## Scope

No redesign and no changes to payment records. This is limited to making the existing single-page unpaid ledger load reliably and proving access for all committee members and admins.
