
## Goal
The Site Traffic card on `/admin` currently only shows data from the moment in-app tracking was turned on (yesterday). You want it to show the full history going back to launch (~2 months ago) and continue forward from there.

## Where the historical data actually lives
There are two separate sources, and only one of them goes back to launch:

1. **Lovable Project Insights (analytics)** — has the full history since launch. Accessible to me via the `analytics--read_project_analytics` tool (daily or hourly granularity, date-range based). This is where the 213 / 283 numbers you saw came from.
2. **`public.page_visits` table** — only has data from when the in-app tracker started firing (yesterday). It has richer per-path / per-country detail but no history.

There is no way to retroactively populate `page_visits` with real per-visitor rows from before the tracker existed — that data was never captured at the row level. What Lovable Insights gives back is daily rollups (visitors, pageviews, top pages, top countries), not individual visits.

## Plan

### 1. Pull the full history from Lovable Insights
- Call `analytics--read_project_analytics` from launch date through today, daily granularity.
- Confirm which fields are actually returned (visitors, pageviews, top pages, top countries, referrers) so the UI only shows what's real — no fabricated fields.

### 2. Store the historical rollups in a new table
- New table `public.traffic_daily_rollup` (date, unique_visitors, pageviews, top_pages jsonb, top_countries jsonb, top_referrers jsonb, source text).
- Seed it with the Insights history via a migration (one row per day since launch, `source = 'lovable_insights'`).
- Admin-only RLS; standard grants.

### 3. Keep it current going forward
- A daily server function (`refreshTrafficRollup`) pulls yesterday's numbers from Insights and upserts into `traffic_daily_rollup`.
- Scheduled with `pg_cron` + `pg_net` hitting `/api/public/hooks/refresh-traffic-rollup` once a day at 06:00 UTC (auth via `apikey` header per project convention).

### 4. Update the Site Traffic card to merge both sources
- For each day in the selected range, prefer `page_visits` (richer, live) when available, else fall back to `traffic_daily_rollup` (historical).
- Range switcher expands: **7d / 30d / 90d / All time (since launch)**.
- Add a small "Source: Lovable Insights (historical) + in-app tracker (from <date>)" footnote so the mixed source is transparent — no silent stitching.
- Top Pages / Countries / Referrers for historical days come from the rollup's jsonb; for live days from `page_visits`. Union and sort within the selected range.

### 5. What will and won't be available for history
Explicitly, for days before the in-app tracker started:
- Available: unique visitors/day, pageviews/day, whatever top pages/countries/referrers Insights returns.
- Not available: individual visit rows, session-level paths, per-visitor journeys. Insights doesn't expose that.

If Insights turns out to only return totals (not top pages/countries) for old dates, the historical view will show the daily trend line and totals only, and the breakdowns will be marked "Available from <tracker start date>". I'll confirm which fields are populated during step 1 before finalizing the UI.

## Technical section
- Migration: `traffic_daily_rollup` table + GRANTs + RLS (admin read via `has_role`, service_role all) + seed insert from Insights pull.
- `src/lib/site-traffic.functions.ts`: extend `getSiteTraffic` to union `page_visits` aggregates with `traffic_daily_rollup` for the requested range.
- `src/routes/api/public/hooks/refresh-traffic-rollup.ts`: daily upsert endpoint, verified by `apikey` header.
- `src/components/site-traffic-card.tsx`: add 90d / All-time ranges, source footnote, and handle days where only rollup data exists.
- pg_cron schedule: `0 6 * * *` calling the endpoint.

## Confirm before I build
1. What's the exact launch date to backfill from? (I'll use the earliest `created_at` in `invitations` or `events` if you don't specify — say the word and I'll go with that.)
2. OK that historical days will show totals + whatever breakdowns Insights returns, with a visible "historical vs live tracker" note?
