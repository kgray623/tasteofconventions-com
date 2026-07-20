import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TrafficRange = "7d" | "30d";

export type SiteTrafficDaily = {
  date: string; // YYYY-MM-DD (UTC)
  visitors: number;
  pageviews: number;
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
  generatedAt: string;
};

/**
 * Public: record a single page view. Called from the client on route changes.
 * No auth required; writes go through the service-role client (RLS bypass)
 * because the page_visits table has no anon/authenticated INSERT policy.
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
 * Admin: aggregate page_visits for the given window.
 */
export const getSiteTraffic = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: { range?: TrafficRange } | undefined) => ({
    range: (raw?.range === "30d" ? "30d" : "7d") as TrafficRange,
  }))
  .handler(async ({ data, context }): Promise<SiteTrafficResponse> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const days = data.range === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("page_visits")
      .select("path, referrer, country, session_id, is_unique_session, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(50000);

    if (error) throw new Error(error.message);
    const visits = rows || [];

    // Build daily buckets (UTC)
    const dayMap = new Map<string, { pageviews: number; sessions: Set<string> }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { pageviews: 0, sessions: new Set() });
    }
    const sessionsAll = new Set<string>();
    const pageCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    const referrerCounts = new Map<string, number>();

    for (const v of visits) {
      const day = String(v.created_at).slice(0, 10);
      const bucket = dayMap.get(day);
      if (bucket) {
        bucket.pageviews += 1;
        if (v.session_id) bucket.sessions.add(v.session_id);
      }
      if (v.session_id) sessionsAll.add(v.session_id);
      pageCounts.set(v.path, (pageCounts.get(v.path) || 0) + 1);
      const c = v.country || "Unknown";
      countryCounts.set(c, (countryCounts.get(c) || 0) + 1);
      const r = normalizeReferrer(v.referrer);
      referrerCounts.set(r, (referrerCounts.get(r) || 0) + 1);
    }

    const daily: SiteTrafficDaily[] = [];
    for (const [date, b] of dayMap) {
      daily.push({ date, pageviews: b.pageviews, visitors: b.sessions.size });
    }
    daily.sort((a, b) => a.date.localeCompare(b.date));

    const pageviews = visits.length;
    const visitors = sessionsAll.size;
    const pageviewsPerVisitor = visitors ? Number((pageviews / visitors).toFixed(2)) : 0;

    return {
      range: data.range,
      totals: { visitors, pageviews, pageviewsPerVisitor },
      daily,
      topPages: topN(pageCounts, 10),
      topCountries: topN(countryCounts, 10),
      topReferrers: topN(referrerCounts, 10),
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
    if (typeof window !== "undefined" && u.host === window.location.host) return "Direct";
    return u.host;
  } catch {
    return String(ref).slice(0, 80);
  }
}
