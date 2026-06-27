import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { getReconciliationRows } from "@/lib/admin-audit.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, ExternalLink, Search, Users } from "lucide-react";

type StatusFilter = "all" | "confirmed" | "declined" | "maybe" | "waitlist" | "pending";

export const Route = createFileRoute("/_authenticated/admin/guests")({
  head: () => ({ meta: [{ title: "Guests — Admin" }] }),
  validateSearch: (s) =>
    z.object({
      status: z.enum(["all", "confirmed", "declined", "maybe", "waitlist", "pending"]).optional(),
      mode: z.enum(["in_person", "zoom"]).optional(),
      audience: z.enum(["all", "guest", "committee"]).optional(),
    }).parse(s),
  component: GuestsPage,
});

type Row = {
  invitation_id: string;
  rsvp_token: string;
  name: string;
  phone: string;
  email: string;
  audience: string;
  is_committee: boolean;
  sms_sent: string;
  rsvp_status: string;
  party_size: number | string;
  attendance_mode: string;
  ordering_food: string;
  responded_at: string;
  preorder_selections: string;
  preorder_meals: number;
};

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "All",
  confirmed: "Confirmed",
  declined: "Declined",
  maybe: "Maybe",
  waitlist: "Waitlist",
  pending: "Pending",
};

function statusOfRow(r: Row): StatusFilter {
  if (r.rsvp_status === "yes") return "confirmed";
  if (r.rsvp_status === "no") return "declined";
  if (r.rsvp_status === "maybe") return "maybe";
  if (r.rsvp_status === "waitlist") return "waitlist";
  return "pending";
}

function StatusBadge({ status }: { status: StatusFilter }) {
  const styles: Record<StatusFilter, string> = {
    confirmed: "bg-green-100 text-green-800 border-green-200",
    declined: "bg-red-100 text-red-800 border-red-200",
    maybe: "bg-amber-100 text-amber-800 border-amber-200",
    waitlist: "bg-blue-100 text-blue-800 border-blue-200",
    pending: "bg-muted text-muted-foreground border-border",
    all: "",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function escapeCsv(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function GuestsPage() {
  const { status, mode, audience } = Route.useSearch();
  const fetchRows = useServerFn(getReconciliationRows);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const activeStatus: StatusFilter = status ?? "all";
  const activeAudience = audience ?? "all";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = (await fetchRows()) as { rows: Row[] };
        if (alive) setRows(res.rows);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load guests");
      }
    })();
    return () => { alive = false; };
  }, [fetchRows]);

  const partyOf = (r: Row) => {
    const n = Number(r.party_size);
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: 0, confirmed: 0, declined: 0, maybe: 0, waitlist: 0, pending: 0 };
    const rsvps: Record<StatusFilter, number> = { all: 0, confirmed: 0, declined: 0, maybe: 0, waitlist: 0, pending: 0 };
    const modePeople = { in_person: 0, zoom: 0 };
    if (!rows) return { people: c, rsvps, modePeople };
    for (const r of rows) {
      const s = statusOfRow(r);
      const p = partyOf(r);
      c.all += p;
      c[s] += p;
      rsvps.all += 1;
      rsvps[s] += 1;
      if (s === "confirmed") {
        if (r.attendance_mode === "zoom") modePeople.zoom += p;
        else modePeople.in_person += p;
      }
    }
    return { people: c, rsvps, modePeople };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeStatus !== "all" && statusOfRow(r) !== activeStatus) return false;
      if (mode && r.attendance_mode !== mode) return false;
      if (activeAudience === "guest" && r.is_committee) return false;
      if (activeAudience === "committee" && !r.is_committee) return false;
      if (q) {
        const hay = `${r.name} ${r.phone} ${r.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, activeStatus, activeAudience, mode, query]);

  const exportCsv = () => {
    const headers = ["name", "phone", "email", "audience", "status", "party_size", "attendance_mode", "responded_at"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push([
        r.name, r.phone, r.email, r.audience, r.rsvp_status,
        r.party_size, r.attendance_mode, r.responded_at,
      ].map(escapeCsv).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guests-${activeStatus}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const tabs: StatusFilter[] = ["all", "confirmed", "declined", "maybe", "waitlist", "pending"];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-terracotta/10 p-3 text-terracotta">
          <Users className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Guests</p>
          <h2 className="font-display text-2xl">Everyone uploaded — by RSVP status</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {rows === null
              ? "Loading…"
              : activeStatus === "confirmed"
                ? <>Confirmed: <span className="tabular-nums font-medium text-ink">{counts.people.confirmed}</span> people across <span className="tabular-nums font-medium text-ink">{counts.rsvps.confirmed}</span> RSVPs (<span className="tabular-nums">{counts.modePeople.in_person}</span> in person · <span className="tabular-nums">{counts.modePeople.zoom}</span> Zoom).</>
                : <>Showing <span className="tabular-nums font-medium text-ink">{counts.people[activeStatus]}</span> people across <span className="tabular-nums font-medium text-ink">{filtered.length}</span> guests (of <span className="tabular-nums font-medium text-ink">{counts.rsvps.all}</span> total uploaded · <span className="tabular-nums">{counts.people.all}</span> people if everyone showed up).</>
            }
          </p>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => {
            const active = activeStatus === t;
            return (
              <Link
                key={t}
                to="/admin/guests"
                search={(prev: Record<string, unknown>) => ({ ...prev, status: t === "all" ? undefined : t })}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition ${
                  active ? "bg-ink text-cream border-ink" : "bg-background hover:bg-muted border-border"
                }`}
              >
                {STATUS_LABEL[t]}
                <span className={`tabular-nums text-xs ${active ? "text-cream/80" : "text-muted-foreground"}`}>
                  {counts.people[t]}
                </span>
                <span className={`tabular-nums text-[10px] ${active ? "text-cream/60" : "text-muted-foreground/70"}`}>
                  ({counts.rsvps[t]})
                </span>
              </Link>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Big number = <strong>people</strong> (party-size totals). (small) = RSVP guest count.</p>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, or email"
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV ({filtered.length})
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <p className="text-sm">Could not load guests: {error}</p>
        </Card>
      )}

      {rows === null && !error && (
        <p className="text-sm text-muted-foreground">Loading guests…</p>
      )}

      {rows && filtered.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No guests match this filter.
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((r) => {
          const s = statusOfRow(r);
          return (
            <Card key={r.invitation_id} className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <p className="font-medium">{r.name || "(no name)"}</p>
                    <StatusBadge status={s} />
                    {r.is_committee && (
                      <span className="text-[10px] uppercase tracking-wider text-terracotta border border-terracotta/30 rounded px-1.5 py-0.5">
                        Committee
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.phone || "no phone"}
                    {r.email && <> · {r.email}</>}
                  </p>
                  {s === "confirmed" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Party of {r.party_size || 1}
                      {r.attendance_mode === "zoom" ? " · Zoom" : r.attendance_mode === "in_person" ? " · In person" : ""}
                      {r.preorder_meals > 0 && <> · {r.preorder_meals} meal{r.preorder_meals === 1 ? "" : "s"}</>}
                    </p>
                  )}
                  {r.responded_at && (
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      Responded {new Date(r.responded_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {r.rsvp_token && (
                  <a
                    href={`/rsvp/${r.rsvp_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-terracotta hover:underline shrink-0"
                  >
                    Open RSVP <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
