import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TrafficRange = "7d" | "30d" | "90d" | "all";

export type SiteTrafficDaily = {
  date: string; // YYYY-MM-DD (UTC)
  visitors: number;
  pageviews: number;
  source: "rollup" | "tracker"; // where this day's numbers came from
};

export type SiteTrafficTop = { key: string; count: number };

export type SiteTrafficResponse = {
  range: TrafficRange;
  totals: {
    visitors: number;
    pageviews: number;
    pageviewsPerVisitor: number;
  };
  daily: SiteTrafficDaily[];
  topPages: SiteTrafficTop[];
  topCountries: SiteTrafficTop[];
  topReferrers: SiteTrafficTop[];
  trackerStart: string | null; // first date in-app tracker recorded a visit
  launchDate: string | null; // earliest date in rollup
  generatedAt: string;
};

/**
 * Public: record a single page view. Called from the client on route changes.
 */
export const logPageVisit = createServerFn({ method: "POST" })
  .inputValidator((raw: { path: string; referrer?: string | null; sessionId: string; isUnique: boolean }) => ({
    path: String(raw.path || "/").slice(0, 500),
    referrer: raw.referrer ? String(raw.referrer).slice(0, 500) : null,
    sessionId: String(raw.sessionId || "").slice(0, 100),
    isUnique: Boolean(raw.isUnique),
  }))
  .handler(async ({ data }) => {
    if (!data.sessionId) return { ok: false as const };
    const req = getRequest();
    const headers = req.headers;
    const country =
      headers.get("cf-ipcountry") ||
      headers.get("x-vercel-ip-country") ||
      headers.get("x-country") ||
      null;
    const userAgent = headers.get("user-agent")?.slice(0, 300) || null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("page_visits").insert({
      path: data.path,
      referrer: data.referrer,
      country,
      session_id: data.sessionId,
      is_unique_session: data.isUnique,
      user_agent: userAgent,
    });
    return { ok: true as const };
  });

/**
 * Admin: merged traffic view over rollup (historical) + page_visits (live).
 * - Rollup rows are the source of truth per day when present.
 * - page_visits fills days without a rollup row and feeds top pages/countries/referrers.
 */
export const getSiteTraffic = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: { range?: TrafficRange } | undefined) => ({
    range: (["7d", "30d", "90d", "all"].includes(raw?.range as string)
      ? (raw!.range as TrafficRange)
      : "30d") as TrafficRange,
  }))
  .handler(async ({ data, context }): Promise<SiteTrafficResponse> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Determine window
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    let sinceDate: Date;
    if (data.range === "all") {
      // Look up earliest rollup date
      const { data: firstRow } = await supabaseAdmin
        .from("traffic_daily_rollup")
        .select("date")
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      sinceDate = firstRow?.date ? new Date(firstRow.date + "T00:00:00Z") : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    } else {
      const days = data.range === "7d" ? 7 : data.range === "30d" ? 30 : 90;
      sinceDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    }
    const sinceKey = sinceDate.toISOString().slice(0, 10);

    // Pull rollup rows in window
    const { data: rollupRows } = await supabaseAdmin
      .from("traffic_daily_rollup")
      .select("date, unique_visitors, pageviews")
      .gte("date", sinceKey)
      .order("date", { ascending: true });
    const rollupMap = new Map<string, { visitors: number; pageviews: number }>();
    for (const r of rollupRows || []) {
      rollupMap.set(String(r.date), { visitors: r.unique_visitors, pageviews: r.pageviews });
    }

    // Pull page_visits in window (capped)
    const { data: visitRows, error: vErr } = await supabaseAdmin
      .from("page_visits")
      .select("path, referrer, country, session_id, created_at")
      .gte("created_at", sinceDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(50000);
    if (vErr) throw new Error(vErr.message);
    const visits = visitRows || [];

    // Detect tracker start (earliest tracked date overall)
    const { data: firstVisit } = await supabaseAdmin
      .from("page_visits")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const trackerStart = firstVisit?.created_at ? String(firstVisit.created_at).slice(0, 10) : null;

    const { data: launchRow } = await supabaseAdmin
      .from("traffic_daily_rollup")
      .select("date")
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle();
    const launchDate = launchRow?.date ? String(launchRow.date) : null;

    // Aggregate page_visits per day
    const trackerDayMap = new Map<string, { pageviews: number; sessions: Set<string> }>();
    const pageCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    const referrerCounts = new Map<string, number>();
    for (const v of visits) {
      const day = String(v.created_at).slice(0, 10);
      let b = trackerDayMap.get(day);
      if (!b) {
        b = { pageviews: 0, sessions: new Set() };
        trackerDayMap.set(day, b);
      }
      b.pageviews += 1;
      if (v.session_id) b.sessions.add(v.session_id);
      pageCounts.set(v.path, (pageCounts.get(v.path) || 0) + 1);
      const c = v.country || "Unknown";
      countryCounts.set(c, (countryCounts.get(c) || 0) + 1);
      const r = normalizeReferrer(v.referrer);
      referrerCounts.set(r, (referrerCounts.get(r) || 0) + 1);
    }

    // Build daily series from sinceKey through today
    const daily: SiteTrafficDaily[] = [];
    const cursor = new Date(sinceDate);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = new Date(todayKey + "T00:00:00Z");
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const roll = rollupMap.get(key);
      if (roll) {
        daily.push({ date: key, visitors: roll.visitors, pageviews: roll.pageviews, source: "rollup" });
      } else {
        const tr = trackerDayMap.get(key);
        daily.push({
          date: key,
          visitors: tr ? tr.sessions.size : 0,
          pageviews: tr ? tr.pageviews : 0,
          source: "tracker",
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const totalsVisitors = daily.reduce((s, d) => s + d.visitors, 0);
    const totalsPageviews = daily.reduce((s, d) => s + d.pageviews, 0);
    const pageviewsPerVisitor = totalsVisitors ? Number((totalsPageviews / totalsVisitors).toFixed(2)) : 0;

    return {
      range: data.range,
      totals: {
        visitors: totalsVisitors,
        pageviews: totalsPageviews,
        pageviewsPerVisitor,
      },
      daily,
      topPages: topN(pageCounts, 10),
      topCountries: topN(countryCounts, 10),
      topReferrers: topN(referrerCounts, 10),
      trackerStart,
      launchDate,
      generatedAt: new Date().toISOString(),
    };
  });

function topN(map: Map<string, number>, n: number): SiteTrafficTop[] {
  return Array.from(map, ([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function normalizeReferrer(ref: string | null | undefined): string {
  if (!ref) return "Direct";
  try {
    const u = new URL(ref);
    return u.host;
  } catch {
    return String(ref).slice(0, 80);
  }
}
