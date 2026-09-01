# Hide "Unpaid guests" from the committee view

Plan written 2026-09-01 12:2x UTC.

## What changes

Committee (team) members no longer see the **Unpaid guests** link anywhere in the admin/committee navigation, and the page itself stops loading for them. Admins keep it exactly as it is today, including the admin "view as committee" preview toggle behaving as an admin-only surface.

## Behavior after the change

- Committee member signs in: no "Unpaid guests" tab, no badge count, no landing-page entry.
- Committee member types `/admin/unpaid` directly: redirected back to `/admin` (no unpaid data returned).
- Admin: unchanged page, unchanged committee-wide grouped list, unchanged totals.
- No payment records, notes, or texts are deleted or altered. Nothing else in the guests, meal-texts, or covered-dish screens changes.

## Technical notes

- `src/routes/_authenticated/admin.tsx`
  - Remove `team: true` / `teamLabel` from the `unpaid-guests` tab entry so it renders for admins only.
  - Remove `/admin/unpaid` from `teamAllowedPrefixes` so the existing team-route guard redirects committee members away.
  - Keep the `useMyUnpaidMeals()` badge, but only render the badge on the admin-visible tab (the hook already no-ops for non-permitted scopes; nothing else consumes it in the nav).
- `src/routes/_authenticated/admin/unpaid.tsx`: add an admin-only gate via `useRoles()` — non-admins get an immediate redirect to `/admin` instead of the ledger.
- `src/lib/committee-meal-texts.server.ts`: narrow the `scope: "all"` authorization back to admins only, so a committee member cannot obtain the committee-wide unpaid ledger through the server function. Team members keep their own `scope: "mine"` access used by "My meal texts".
- `src/hooks/use-my-unpaid-meals.ts`: request `scope: "all"` only for admins; return empty results for team members so no count leaks.
- `/admin/guests?unpaid=true` keeps redirecting to `/admin/unpaid`, which is now admin-only.

## Verification before I call it done

Playwright at 390x844 on the running app, signed in twice:
- Admin: `/admin/unpaid` renders the grouped list and the nav tab is present.
- Committee member: nav has no "Unpaid guests" entry, and a direct visit to `/admin/unpaid` lands on `/admin`; the server function returns no committee-wide rows for that role.
Screenshots plus a UTC timestamp reported for both roles.
