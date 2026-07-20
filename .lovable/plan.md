## Site Traffic panel on /admin

Add a new "Site Traffic" card to the Admin Overview (`/admin`) that pulls the same numbers as Lovable's Project Insights dashboard, so you can see them alongside RSVP totals.

### What you'll see
- **Headline tiles**: Unique Visitors, Total Pageviews, Pages/Visitor (last 7 days)
- **Daily trend table + sparkline**: visitors and pageviews per day for the last 7 and 30 days (toggle)
- **Top pages**: which routes are getting the most traffic (e.g. `/`, `/rsvp/:token`, `/preorder`)
- **Top locations**: country + region breakdown of where visitors are coming from
- **Referrers**: where traffic is arriving from (direct, SMS link previews, search, etc.)
- **Last updated timestamp** with a manual Refresh button

### Where it lives
- New collapsible section on `/admin` between the RSVP totals card and the Guests table, titled **"Site Traffic (last 7 days)"** with a range switcher (7d / 30d).
- Admin-only — gated by the existing `_authenticated` + admin role check. Not shown on the committee view.

### How the data is fetched
- New server function `getSiteTraffic({ range: '7d' | '30d' })` in `src/lib/analytics.functions.ts`, protected by `requireSupabaseAuth` + admin role check.
- It calls Lovable's project analytics (the same source that powers Project Insights) and returns a normalized shape: `{ totals, daily[], topPages[], topCountries[], topReferrers[], generatedAt }`.
- If the analytics source doesn't expose location/referrer breakdowns for this project, those sub-panels show a small "Not available for this project" note instead of fake data — no invented numbers.

### Technical notes
- Files:
  - `src/lib/analytics.functions.ts` — new server fn
  - `src/components/site-traffic-card.tsx` — new UI card (tiles + tables + sparkline)
  - `src/routes/_authenticated/admin.tsx` — mount the card on the overview
- Uses TanStack Query (`ensureQueryData` in the route loader under `_authenticated`, `useSuspenseQuery` in the card) per the project's data-loading pattern.
- No changes to RSVP math, guest tables, or committee view.

### Out of scope
- No new database tables, no writing traffic events ourselves (we read from the existing analytics source).
- No public-facing traffic page — admin only.
