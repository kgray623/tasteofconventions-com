import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { getReconciliationRows } from "@/lib/admin-audit.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ExternalLink, Search, Users } from "lucide-react";
import { buildDuplicateGroupIds, computeRsvpRollup } from "@/lib/rsvp-math";

type StatusFilter = "all" | "confirmed" | "declined" | "maybe" | "waitlist" | "pending";
type SortMode = "alpha" | "newest" | "oldest";

export const Route = createFileRoute("/_authenticated/admin/guests")({
  head: () => ({ meta: [{ title: "Guests — Admin" }] }),
  validateSearch: (s) =>
    z.object({
      status: z.enum(["all", "confirmed", "declined", "maybe", "waitlist", "pending"]).optional(),
      mode: z.enum(["in_person", "zoom"]).optional(),
      audience: z.enum(["all", "guest", "committee"]).optional(),
      sort: z.enum(["alpha", "newest", "oldest"]).optional(),
      inviter: z.string().optional(),
    }).parse(s),
  component: GuestsPage,
});

type Row = {
  invitation_id: string;
  rsvp_token: string;
  created_at: string;
  name: string;
  phone: string;
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
  inviter_id?: string;
  inviter_name?: string;
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

function rollupRows(sourceRows: Row[]) {
  const groupIds = buildDuplicateGroupIds(sourceRows.map((r) => ({
    id: r.invitation_id,
    guest_name: r.name,
    guest_phone: r.phone,
  })));
  return computeRsvpRollup(sourceRows.map((r) => ({
    id: r.invitation_id,
    groupId: groupIds.get(r.invitation_id) ?? r.invitation_id,
    status: r.rsvp_status === "pending" ? null : r.rsvp_status,
    party_size: r.party_size,
    attendance_mode: r.attendance_mode,
  })));
}

function GuestsPage() {
  const { status, mode, audience, sort, inviter } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/guests" });
  const fetchRows = useServerFn(getReconciliationRows);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const activeStatus: StatusFilter = status ?? "all";
  const activeAudience = audience ?? "all";
  const activeSort: SortMode = sort ?? "alpha";
  const activeInviter = inviter ?? "all";


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

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: 0, confirmed: 0, declined: 0, maybe: 0, waitlist: 0, pending: 0 };
    const rsvps: Record<StatusFilter, number> = { all: 0, confirmed: 0, declined: 0, maybe: 0, waitlist: 0, pending: 0 };
    const modePeople = { in_person: 0, zoom: 0 };
    const modeResponses = { in_person: 0, zoom: 0 };
    if (!rows) return { people: c, rsvps, modePeople, modeResponses };
    const rollup = rollupRows(rows);
    c.all = rollup.people.allIfEveryoneShowed;
    c.confirmed = rollup.people.confirmed;
    c.declined = rollup.people.declined;
    c.maybe = rollup.people.maybe;
    c.waitlist = rollup.people.waitlist;
    c.pending = rollup.responses.pending;
    rsvps.all = rollup.responses.uploaded;
    rsvps.confirmed = rollup.responses.confirmed;
    rsvps.declined = rollup.responses.declined;
    rsvps.maybe = rollup.responses.maybe;
    rsvps.waitlist = rollup.responses.waitlist;
    rsvps.pending = rollup.responses.pending;
    modePeople.in_person = rollup.people.inPerson;
    modePeople.zoom = rollup.people.zoom;
    modeResponses.in_person = rollup.responses.inPerson;
    modeResponses.zoom = rollup.responses.zoom;
    return { people: c, rsvps, modePeople, modeResponses };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    const qNorm = q.replace(/[^a-z0-9]/g, "");
    const bigrams = (s: string) => {
      const out = new Map<string, number>();
      for (let i = 0; i < s.length - 1; i++) {
        const g = s.slice(i, i + 2);
        out.set(g, (out.get(g) ?? 0) + 1);
      }
      return out;
    };
    const dice = (a: string, b: string) => {
      if (!a || !b || a.length < 2 || b.length < 2) return 0;
      const aB = bigrams(a), bB = bigrams(b);
      let inter = 0, aT = 0, bT = 0;
      for (const v of aB.values()) aT += v;
      for (const v of bB.values()) bT += v;
      for (const [g, ca] of aB) {
        const cb = bB.get(g);
        if (cb) inter += Math.min(ca, cb);
      }
      return (2 * inter) / (aT + bT);
    };
    const qNameNorm = q.replace(/[^a-z]/g, "");
    return rows.filter((r) => {
      if (activeStatus !== "all" && statusOfRow(r) !== activeStatus) return false;
      if (mode && r.attendance_mode !== mode) return false;
      if (activeAudience === "guest" && r.is_committee) return false;
      if (activeAudience === "committee" && !r.is_committee) return false;
      if (activeInviter !== "all") {
        if (activeInviter === "none") {
          if (r.inviter_id) return false;
        } else if ((r.inviter_id ?? "") !== activeInviter) return false;
      }
      if (q) {
        const nameNorm = r.name.toLowerCase().replace(/[^a-z]/g, "");
        const hay = `${r.name} ${r.phone} ${r.inviter_name ?? ""}`.toLowerCase();
        if (hay.includes(q)) return true;
        if (qNorm && (nameNorm.includes(qNameNorm) || r.phone.replace(/\D/g, "").includes(qNorm))) return true;
        // Fuzzy spelling match (e.g. "Daisy" finds "Deisy")
        if (qNameNorm.length >= 3 && dice(qNameNorm, nameNorm) >= 0.6) return true;
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (activeSort === "newest" || activeSort === "oldest") {
        const at = a.created_at ? Date.parse(a.created_at) : 0;
        const bt = b.created_at ? Date.parse(b.created_at) : 0;
        if (at !== bt) return activeSort === "newest" ? bt - at : at - bt;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [rows, activeStatus, activeAudience, mode, query, activeSort, activeInviter]);

  const inviterOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const r of rows ?? []) {
      if (!r.inviter_id) continue;
      const cur = map.get(r.inviter_id);
      if (cur) cur.count++;
      else map.set(r.inviter_id, { id: r.inviter_id, name: r.inviter_name || "(unnamed)", count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
  const unattributedCount = useMemo(
    () => (rows ?? []).filter((r) => !r.inviter_id).length,
    [rows],
  );


  const filteredCounts = useMemo(() => {
    const rollup = rollupRows(filtered);
    return {
      people: {
        all: rollup.people.allIfEveryoneShowed,
        confirmed: rollup.people.confirmed,
        declined: rollup.people.declined,
        maybe: rollup.people.maybe,
        waitlist: rollup.people.waitlist,
        pending: rollup.responses.pending,
      } as Record<StatusFilter, number>,
      rsvps: {
        all: rollup.responses.uploaded,
        confirmed: rollup.responses.confirmed,
        declined: rollup.responses.declined,
        maybe: rollup.responses.maybe,
        waitlist: rollup.responses.waitlist,
        pending: rollup.responses.pending,
      } as Record<StatusFilter, number>,
      modePeople: { in_person: rollup.people.inPerson, zoom: rollup.people.zoom },
      modeResponses: { in_person: rollup.responses.inPerson, zoom: rollup.responses.zoom },
    };
  }, [filtered]);


  const exportCsv = () => {
    const headers = ["name", "phone", "audience", "status", "party_size", "attendance_mode", "responded_at", "brought_by"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push([
        r.name, r.phone, r.audience, r.rsvp_status,
        r.party_size, r.attendance_mode, r.responded_at,
        r.inviter_name ?? "",
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
                ? <>Confirmed: <span className="tabular-nums font-medium text-ink">{filteredCounts.rsvps.confirmed}</span> RSVP records = <span className="tabular-nums font-medium text-ink">{filteredCounts.people.confirmed}</span> people by party size (<span className="tabular-nums">{filteredCounts.modePeople.in_person}</span> in-person people from <span className="tabular-nums">{filteredCounts.modeResponses.in_person}</span> RSVPs · <span className="tabular-nums">{filteredCounts.modePeople.zoom}</span> Zoom people from <span className="tabular-nums">{filteredCounts.modeResponses.zoom}</span> RSVPs).</>
                : activeStatus === "declined"
                  ? <>Declined: <span className="tabular-nums font-medium text-ink">{filteredCounts.rsvps.declined}</span> guests/RSVPs (<span className="tabular-nums font-medium text-ink">{filteredCounts.people.declined}</span> people by party size) of <span className="tabular-nums font-medium text-ink">{counts.rsvps.all}</span> reconciled uploaded guests.</>
                : activeStatus === "pending"
                  ? <>Pending: <span className="tabular-nums font-medium text-ink">{filteredCounts.rsvps.pending}</span> guests with no RSVP yet (of <span className="tabular-nums font-medium text-ink">{counts.rsvps.all}</span> total uploaded).</>
                  : <>Showing <span className="tabular-nums font-medium text-ink">{filteredCounts.rsvps[activeStatus]}</span> guests/RSVPs (<span className="tabular-nums font-medium text-ink">{filteredCounts.people[activeStatus]}</span> people by party size) of <span className="tabular-nums font-medium text-ink">{counts.rsvps.all}</span> reconciled uploaded guests.</>
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
                  {counts.rsvps[t]}
                </span>
                <span className={`tabular-nums text-[10px] ${active ? "text-cream/60" : "text-muted-foreground/70"}`}>
                  ({counts.people[t]})
                </span>
              </Link>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Tab number = <strong>guest/RSVP records</strong>. Parentheses = people by party size after duplicate reconciliation.</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Reconciled totals: <strong>{counts.rsvps.confirmed}</strong> confirmed RSVP records = <strong>{counts.people.confirmed}</strong> people
          (<strong>{counts.modePeople.in_person}</strong> in-person people from <strong>{counts.modeResponses.in_person}</strong> RSVPs · <strong>{counts.modePeople.zoom}</strong> Zoom people from <strong>{counts.modeResponses.zoom}</strong> RSVPs);
          declined <strong>{counts.rsvps.declined}</strong> records = <strong>{counts.people.declined}</strong> people; pending <strong>{counts.rsvps.pending}</strong> records.
        </p>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone"
            className="pl-9"
          />
        </div>
        <Select
          value={activeSort}
          onValueChange={(v) =>
            navigate({
              search: (prev: Record<string, unknown>) => ({ ...prev, sort: v === "alpha" ? undefined : (v as SortMode) }),
            })
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alpha">Alphabetical</SelectItem>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
        {(inviterOptions.length > 0 || unattributedCount > 0) && (
          <Select
            value={activeInviter}
            onValueChange={(v) =>
              navigate({
                search: (prev: Record<string, unknown>) => ({ ...prev, inviter: v === "all" ? undefined : v }),
              })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Brought by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Brought by: anyone</SelectItem>
              {unattributedCount > 0 && (
                <SelectItem value="none">Not attributed ({unattributedCount})</SelectItem>
              )}
              {inviterOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>{opt.name} ({opt.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
                  </p>
                  {r.inviter_name && (
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      Brought by <span className="text-ink/80 font-medium">{r.inviter_name}</span>
                    </p>
                  )}

                  {(s === "confirmed" || s === "maybe" || s === "waitlist" || (s === "declined" && r.party_size)) && (
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
