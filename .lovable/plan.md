# One "Unpaid guests" page for the whole committee

Plan written 2026-08-22 13:0x UTC.

## What you get

One link, labeled exactly **Unpaid guests**, that opens one page at `/admin/unpaid`. That page shows every unpaid guest for the whole event, grouped under the committee member who invited them — the same list for admins and for every committee member. No filters to set, no tabs, no scrolling past a general guest roster.

Each group shows:
- Committee member name, their unpaid guest count and plate count
- Each guest: name, tappable phone, cuisine, plates, amount owed (per-restaurant chicken–beef range), and whether the payment text was sent
- Guests with no committee member recorded get their own clearly labeled group at the end, so nobody is hidden

Top of the page: committee-wide totals (guests, plates, amount outstanding) and a "read from the database at HH:MM UTC" line. Guests who declined or are Zoom-only stay excluded, same rule as today.

## Where the link appears

- Steering Committee landing page: the existing "Unpaid guests" item points to the new page (badge count now the committee-wide number).
- Admin landing page and admin nav: same single "Unpaid guests" link, same page.
- Nothing else about the guests screen changes; `/admin/guests?unpaid=true` keeps working and redirects to the new page so old links/bookmarks don't break.

## Access

Every logged-in committee member (`team` role) and every admin sees the full committee-wide list. Guests and logged-out visitors cannot reach it.

## Technical notes

- New route `src/routes/_authenticated/admin/unpaid.tsx`. It renders only the banner + grouped list (reusing `UnpaidByCommittee`-style presentation over the committee ledger), with its own `head()` metadata.
- `src/lib/committee-meal-texts.server.ts`: `loadCommitteeMealTexts` currently gates `scope: "all"` on `identity.isAdmin`. Widen that gate to admin **or** team so committee members get the same full list; keep the guard so non-team callers get nothing.
- `src/hooks/use-my-unpaid-meals.ts`: request `scope: "all"` for any team member (not just admins) and keep the shared TanStack Query key so the nav badge and the page always read one ledger result.
- Money and paid/unpaid logic unchanged: `isPaidState` plus `mealPricesForCuisine` from `src/lib/meal-pricing.ts` remain the only sources.
- `src/routes/_authenticated/admin/guests.tsx`: keep the data logic, drop the unpaid-only presentation branch, and redirect `?unpaid=true` to `/admin/unpaid`.

## Verification before I call it done

Playwright at 384px (your device width) on the published-style build, for two accounts — your admin login and a non-admin committee login: one tap on "Unpaid guests", screenshot proving the banner and first grouped rows are the first thing on screen with zero scrolling, plus a second screenshot of a named group further down. Group counts and totals read back from the database with SQL and reported with a UTC timestamp.
