import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSiteTraffic, type SiteTrafficResponse, type TrafficRange } from "@/lib/site-traffic.functions";
import { BarChart3, RefreshCw, Users, Eye, Layers } from "lucide-react";

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(1, ...values);
  const w = 240;
  const h = 40;
  const stepX = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10 text-terracotta">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}

function Tile({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}

function TopList({ title, rows, formatKey }: { title: string; rows: { key: string; count: number }[]; formatKey?: (k: string) => string }) {
  if (rows.length === 0) {
    return (
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
        <p className="text-sm text-muted-foreground">No data yet.</p>
      </div>
    );
  }
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate font-mono text-xs">{formatKey ? formatKey(r.key) : r.key}</span>
              <span className="tabular-nums text-muted-foreground">{r.count}</span>
            </div>
            <div className="mt-0.5 h-1 rounded bg-muted overflow-hidden">
              <div className="h-full bg-terracotta/70" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteTrafficCard() {
  const [range, setRange] = useState<TrafficRange>("all");
  const fetchFn = useServerFn(getSiteTraffic);
  const query = useQuery<SiteTrafficResponse>({
    queryKey: ["site-traffic", range],
    queryFn: () => fetchFn({ data: { range } }),
    staleTime: 60_000,
  });


  const data = query.data;
  const sparkVisitors = useMemo(() => data?.daily.map((d) => d.visitors) ?? [], [data]);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-terracotta" />
          <h3 className="font-display text-lg">Site traffic</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
            {(["7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 ${range === r ? "bg-ink text-cream" : "bg-background text-muted-foreground hover:text-ink"}`}
              >
                {r === "all" ? "All time" : `Last ${r === "7d" ? "7" : r === "30d" ? "30" : "90"} days`}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading traffic…</p>
      ) : query.error ? (
        <p className="text-sm text-destructive">Couldn't load traffic: {(query.error as Error).message}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Tile label="Unique visitors" value={data.totals.visitors} icon={Users} />
            <Tile label="Pageviews" value={data.totals.pageviews} icon={Eye} />
            <Tile label="Pages / visitor" value={data.totals.pageviewsPerVisitor} icon={Layers} />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Visitors per day {data.launchDate ? `(since ${data.launchDate})` : ""}
            </p>
            <Sparkline values={sparkVisitors} />
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 text-[11px] text-muted-foreground">
              {data.daily.slice(-14).map((d) => (
                <div key={d.date} className="flex items-baseline justify-between border-t border-border pt-1">
                  <span>{d.date.slice(5)}</span>
                  <span className="tabular-nums text-ink">{d.visitors}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
            <TopList title={`Top pages${data.trackerStart ? ` (since ${data.trackerStart})` : ""}`} rows={data.topPages} />
            <TopList
              title={`Top countries${data.trackerStart ? ` (since ${data.trackerStart})` : ""}`}
              rows={data.topCountries}
              formatKey={(k) => (k === "Unknown" ? "Unknown" : k)}
            />
            <TopList title={`Top referrers${data.trackerStart ? ` (since ${data.trackerStart})` : ""}`} rows={data.topReferrers} />
          </div>

          <p className="text-[11px] text-muted-foreground pt-1">
            Daily totals: Lovable Insights history{data.launchDate ? ` since ${data.launchDate}` : ""}
            {data.trackerStart ? `, in-app tracker from ${data.trackerStart} forward` : ""}.
            Top pages / countries / referrers come from the in-app tracker only
            {data.trackerStart ? ` (available from ${data.trackerStart})` : ""}.
            Refreshed {new Date(data.generatedAt).toLocaleTimeString()}.
          </p>
        </>
      ) : null}

    </Card>
  );
}
