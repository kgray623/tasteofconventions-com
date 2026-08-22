import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { getReconciliationRows } from "@/lib/admin-audit.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ExternalLink, Pencil, Search, Users } from "lucide-react";
import { buildDuplicateGroupIds, computeRsvpRollup } from "@/lib/rsvp-math";
import { toast } from "sonner";
import { downloadTextFile } from "@/lib/download-file";
import { ExportFallbackDialog } from "@/components/export-fallback-dialog";
import { GuestEditDialog, type GuestEditTarget } from "@/components/guest-edit-dialog";
import { useMyUnpaidMeals, normalizeUnpaidName } from "@/hooks/use-my-unpaid-meals";
import { phoneTail } from "@/lib/phone";


const GUEST_LOAD_TIMEOUT_MS = 20_000;

type StatusFilter = "all" | "confirmed" | "declined" | "maybe" | "waitlist" | "pending";
type SortMode = "alpha" | "newest" | "oldest" | "replied";

export const Route = createFileRoute("/_authenticated/admin/guests")({
  head: () => ({
    meta: [
      { title: "Guest Roster — Taste of Conventions Admin" },
      {
        name: "description",
        content: "Admin guest roster for A Taste of Special Conventions with RSVP status and attendance filters.",
      },
      { property: "og:title", content: "Guest Roster — Taste of Conventions Admin" },
      {
        property: "og:description",
        content: "Admin guest roster for A Taste of Special Conventions with RSVP status and attendance filters.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s) =>
    z.object({
      status: z.enum(["all", "confirmed", "declined", "maybe", "waitlist", "pending"]).optional(),
      mode: z.enum(["in_person", "zoom"]).optional(),
      audience: z.enum(["all", "guest", "committee"]).optional(),
      sort: z.enum(["alpha", "newest", "oldest", "replied"]).optional(),
      inviter: z.string().optional(),
      unpaid: z.coerce.boolean().optional(),
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
  invited_by_rsvp?: string;
  linked_inviter_name?: string;
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

type GuestSearchState = {
  status?: StatusFilter;
  mode?: "in_person" | "zoom";
  audience?: "all" | "guest" | "committee";
  sort?: SortMode;
  inviter?: string;
  unpaid?: boolean;
};

const cleanGuestSearch = (search: GuestSearchState): GuestSearchState => ({
  status: search.status && search.status !== "all" ? search.status : undefined,
  mode: search.mode,
  audience: search.audience && search.audience !== "all" ? search.audience : undefined,
  // "replied" (latest reply first) is the default, so it stays out of the URL.
  sort: search.sort && search.sort !== "replied" ? search.sort : undefined,
  inviter: search.inviter && search.inviter !== "all" ? search.inviter : undefined,
  unpaid: search.unpaid ? true : undefined,
});

function GuestsPage() {
  const { status, mode, audience, sort, inviter, unpaid } = Route.useSearch();
  const unpaidMeals = useMyUnpaidMeals();
  const unpaidOnly = Boolean(unpaid);
  const navigate = useNavigate({ from: "/admin/guests" });
  const fetchRows = useServerFn(getReconciliationRows);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [scope, setScope] = useState<"admin" | "mine">("admin");
  const [editing, setEditing] = useState<GuestEditTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const activeStatus: StatusFilter = status ?? "all";
  const activeAudience = audience ?? "all";
  const activeSort: SortMode = sort ?? "replied";
  const activeInviter = inviter ?? "all";


  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = (await Promise.race([
          fetchRows(),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("Guest list took too long to load. Please refresh.")), GUEST_LOAD_TIMEOUT_MS);
          }),
        ])) as { rows: Row[]; scope?: "admin" | "mine" };
        if (alive) {
          setRows(res.rows);
          setScope(res.scope ?? "admin");
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load guests");
      }
    })();
    return () => { alive = false; };
    // Load once on page open; depending on the wrapped server function can
    // restart the request repeatedly before the full roster finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    c.pending = rollup.people.pending;
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
      if (unpaidOnly) {
        // Wait for the ledger before hiding anyone; otherwise the first render
        // pass filters every row out and the list looks empty.
        if (unpaidMeals.loading) return false;
        const byId = r.invitation_id && unpaidMeals.unpaidInvitationIds.has(r.invitation_id);
        const tail = phoneTail(r.phone);
        const byPhone = tail.length >= 7 && unpaidMeals.unpaidPhoneTails.has(tail);
        const byName = unpaidMeals.unpaidNames.has(normalizeUnpaidName(r.name));
        if (!byId && !byPhone && !byName) return false;
      }

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
        const hay = `${r.name} ${r.phone} ${r.inviter_name ?? ""} ${r.linked_inviter_name ?? ""}`.toLowerCase();
        if (hay.includes(q)) return true;
        if (qNorm && (nameNorm.includes(qNameNorm) || r.phone.replace(/\D/g, "").includes(qNorm))) return true;
        // Fuzzy spelling match (e.g. "Daisy" finds "Deisy")
        if (qNameNorm.length >= 3 && dice(qNameNorm, nameNorm) >= 0.6) return true;
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (activeSort === "replied") {
        const at = a.responded_at ? Date.parse(a.responded_at) : 0;
        const bt = b.responded_at ? Date.parse(b.responded_at) : 0;
        if (at !== bt) return bt - at;
        return a.name.localeCompare(b.name);
      }
      if (activeSort === "newest" || activeSort === "oldest") {
        const at = a.created_at ? Date.parse(a.created_at) : 0;
        const bt = b.created_at ? Date.parse(b.created_at) : 0;
        if (at !== bt) return activeSort === "newest" ? bt - at : at - bt;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [rows, activeStatus, activeAudience, mode, query, activeSort, activeInviter, unpaidOnly, unpaidMeals.loading, unpaidMeals.unpaidPhoneTails, unpaidMeals.unpaidInvitationIds, unpaidMeals.unpaidNames]);

  const inviterOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const r of rows ?? []) {
      if (!r.inviter_id) continue;
      const cur = map.get(r.inviter_id);
      if (cur) cur.count++;
      else map.set(r.inviter_id, { id: r.inviter_id, name: r.linked_inviter_name || r.inviter_name || "(unnamed)", count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
  const unattributedCount = useMemo(
    () => (rows ?? []).filter((r) => !r.inviter_id).length,
    [rows],
  );

  // In the admin-wide unpaid view, group guests under the committee member who
  // owns them (label comes straight from the shared ledger rows).
  const displayGroups = useMemo((): { key: string; label: string | null; rows: Row[] }[] => {
    const grouped = unpaidOnly && unpaidMeals.isAdminScope;
    if (!grouped) return [{ key: "all", label: null, rows: filtered }];
    const labelFor = (r: Row) => {
      const byId = r.invitation_id
        ? unpaidMeals.inviterByInvitationId.get(r.invitation_id)
        : undefined;
      if (byId) return byId;
      const tail = phoneTail(r.phone);
      const byPhone = tail.length >= 7 ? unpaidMeals.inviterByPhoneTail.get(tail) : undefined;
      if (byPhone) return byPhone;
      return (
        unpaidMeals.inviterByName.get(normalizeUnpaidName(r.name)) ??
        "No committee member recorded"
      );
    };
    const map = new Map<string, { key: string; label: string | null; rows: Row[] }>();
    for (const r of filtered) {
      const label = labelFor(r);
      const entry = map.get(label) ?? { key: label, label, rows: [] };
      entry.rows.push(r);
      map.set(label, entry);
    }
    return Array.from(map.values()).sort((a, b) => {
      const aNone = a.label === "No committee member recorded";
      const bNone = b.label === "No committee member recorded";
      if (aNone !== bNone) return aNone ? 1 : -1;
      return (a.label ?? "").localeCompare(b.label ?? "", undefined, { sensitivity: "base" });
    });
  }, [
    filtered,
    unpaidOnly,
    unpaidMeals.isAdminScope,
    unpaidMeals.inviterByInvitationId,
    unpaidMeals.inviterByPhoneTail,
    unpaidMeals.inviterByName,
  ]);


  const filteredCounts = useMemo(() => {
    const rollup = rollupRows(filtered);
    return {
      people: {
        all: rollup.people.allIfEveryoneShowed,
        confirmed: rollup.people.confirmed,
        declined: rollup.people.declined,
        maybe: rollup.people.maybe,
        waitlist: rollup.people.waitlist,
        pending: rollup.people.pending,
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

  const [fallback, setFallback] = useState<{ filename: string; text: string } | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);


  const exportCsv = () => {
    const headers = ["name", "phone", "audience", "status", "party_size", "attendance_mode", "responded_at", "invited_by_rsvp", "linked_under"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push([
        r.name, r.phone, r.audience, r.rsvp_status,
        r.party_size, r.attendance_mode, r.responded_at,
        r.inviter_name ?? "",
        r.linked_inviter_name ?? "",
      ].map(escapeCsv).join(","));
    }
    const csv = lines.join("\n");
    const filename = `guests-${activeStatus}-${new Date().toISOString().slice(0, 10)}.csv`;
    setFallback({ filename, text: csv });
    const res = downloadTextFile(filename, csv);
    if (res.ok) {
      toast.success("Guest list downloaded", {
        action: { label: "Copy instead", onClick: () => setFallbackOpen(true) },
      });
    } else {
      setFallbackOpen(true);
      toast.error("Your browser blocked the download", { description: res.reason });
    }
  };



  const tabs: StatusFilter[] = ["all", "confirmed", "declined", "maybe", "waitlist", "pending"];
  const currentCleanSearch = cleanGuestSearch({
    status: activeStatus,
    mode,
    audience: activeAudience,
    sort: activeSort,
    inviter: activeInviter,
    unpaid: unpaidOnly ? true : undefined,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasPreviewParam = Array.from(params.keys()).some((key) => key.startsWith("__lovable"));
    if (!hasPreviewParam) return;
    navigate({ search: currentCleanSearch, replace: true });
  }, [
    navigate,
    currentCleanSearch.status,
    currentCleanSearch.mode,
    currentCleanSearch.audience,
    currentCleanSearch.sort,
    currentCleanSearch.inviter,
    currentCleanSearch.unpaid,
  ]);

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
                ? <>Confirmed: <span className="tabular-nums font-medium text-ink">{filteredCounts.people.confirmed}</span> people by party size (<span className="tabular-nums">{filteredCounts.modePeople.in_person}</span> in-person · <span className="tabular-nums">{filteredCounts.modePeople.zoom}</span> Zoom).</>
                : activeStatus === "declined"
                  ? <>Declined: <span className="tabular-nums font-medium text-ink">{filteredCounts.people.declined}</span> people by party size.</>
                : activeStatus === "pending"
                  ? <>Pending: <span className="tabular-nums font-medium text-ink">{filteredCounts.people.pending}</span> people with no RSVP yet.</>
                  : <>Showing <span className="tabular-nums font-medium text-ink">{filteredCounts.people[activeStatus]}</span> people by party size.</>
            }
          </p>
        </div>
      </div>

      {unpaidOnly && (
        <Card ref={unpaidCardRef} className="p-3 border-terracotta/40 bg-terracotta/5 scroll-mt-4">

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <strong>Unpaid guests only.</strong>{" "}
              {unpaidMeals.loading
                ? "Checking payments…"
                : unpaidMeals.error
                ? `Could not load payment status: ${unpaidMeals.error}`
                : unpaidMeals.isAdminScope
                ? `${unpaidMeals.count} guests across the whole committee still owe for a meal (${unpaidMeals.plates} plates), grouped by committee member. Guests who declined or are Zoom-only are excluded.`
                : `${unpaidMeals.count} of your guests still owe for a meal (${unpaidMeals.plates} plates). Guests who declined or are Zoom-only are excluded.`}
            </p>
            <Link
              to="/admin/guests"
              search={cleanGuestSearch({ ...currentCleanSearch, unpaid: undefined })}
              className="text-sm underline"
            >
              {unpaidMeals.isAdminScope ? "Show all guests" : "Show all my guests"}
            </Link>
          </div>
        </Card>
      )}


      {scope === "mine" && (
        <p className="text-xs text-muted-foreground">
          You're seeing the guests on your own list. You can update their RSVP on their behalf.
        </p>
      )}

      <Card className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => {
            const active = activeStatus === t;
            return (
              <Link
                key={t}
                to="/admin/guests"
                search={cleanGuestSearch({ ...currentCleanSearch, status: t })}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition ${
                  active ? "bg-ink text-cream border-ink" : "bg-background hover:bg-muted border-border"
                }`}
              >
                {STATUS_LABEL[t]}
                <span className={`tabular-nums text-xs ${active ? "text-cream/80" : "text-muted-foreground"}`}>
                  {counts.people[t]} people
                </span>
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Attending</span>
          {([undefined, "in_person", "zoom"] as const).map((m) => {
            const active = (mode ?? undefined) === m;
            const label = m === "in_person" ? "In person" : m === "zoom" ? "Zoom" : "All";
            const count =
              m === "in_person" ? counts.modePeople.in_person : m === "zoom" ? counts.modePeople.zoom : counts.people.all;
            return (
              <Link
                key={label}
                to="/admin/guests"
                search={cleanGuestSearch({ ...currentCleanSearch, mode: m })}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition ${
                  active ? "bg-terracotta text-cream border-terracotta" : "bg-background hover:bg-muted border-border"
                }`}
              >
                {label}
                <span className={`tabular-nums text-xs ${active ? "text-cream/80" : "text-muted-foreground"}`}>
                  {count} people
                </span>
              </Link>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Tab numbers show <strong>people by party size</strong> after duplicate reconciliation.</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Reconciled totals: <strong>{counts.people.confirmed}</strong> confirmed people
          (<strong>{counts.modePeople.in_person}</strong> in-person · <strong>{counts.modePeople.zoom}</strong> Zoom);
          declined <strong>{counts.people.declined}</strong> people; pending <strong>{counts.people.pending}</strong> people.
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
              search: cleanGuestSearch({ ...currentCleanSearch, sort: v as SortMode }),
            })
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alpha">Alphabetical</SelectItem>
            <SelectItem value="replied">Latest reply</SelectItem>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
        {(inviterOptions.length > 0 || unattributedCount > 0) && (
          <Select
            value={activeInviter}
            onValueChange={(v) =>
              navigate({
                search: cleanGuestSearch({ ...currentCleanSearch, inviter: v }),
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
          {unpaidOnly && unpaidMeals.loading
            ? "Checking who still owes for a meal…"
            : unpaidOnly && unpaidMeals.error
              ? `Could not load payment status: ${unpaidMeals.error}`
              : "No guests match this filter."}
        </Card>
      )}


      <div className="space-y-6">
        {displayGroups.map((group) => (
          <div key={group.key} className="space-y-2">
            {group.label && (
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-1">
                <h3 className="font-display text-lg">{group.label}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {group.rows.length} unpaid guest{group.rows.length === 1 ? "" : "s"}
                </span>
              </div>
            )}
            {group.rows.map((r) => {

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
                  {r.inviter_name ? (
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      Referred by <span className="text-ink/80 font-medium">{r.inviter_name}</span>
                      {r.linked_inviter_name &&
                        r.linked_inviter_name.trim().toLowerCase() !== r.inviter_name.trim().toLowerCase() && (
                          <> · credited to <span className="text-ink/80 font-medium">{r.linked_inviter_name}</span></>
                        )}
                    </p>
                  ) : r.linked_inviter_name ? (
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      Referral not recorded · credited to <span className="text-ink/80 font-medium">{r.linked_inviter_name}</span>
                    </p>
                  ) : null}


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
                <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      invitation_id: r.invitation_id,
                      name: r.name,
                      phone: r.phone,
                      rsvp_status: r.rsvp_status,
                      party_size: r.party_size,
                      attendance_mode: r.attendance_mode,
                      preorder_meals: r.preorder_meals,
                    })
                  }
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit RSVP
                </Button>
                {r.rsvp_token && (
                  <a
                    href={`/rsvp/${encodeURIComponent(r.rsvp_token.trim().replace(/\+/g, "-").replace(/\//g, "_"))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-terracotta hover:underline shrink-0"
                  >
                    Open RSVP <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                </div>
              </div>
            </Card>
              );
            })}
          </div>
        ))}
      </div>


      <GuestEditDialog
        guest={editing}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        onSaved={(saved) =>
          setRows((prev) =>
            prev
              ? prev.map((row) =>
                  row.invitation_id === saved.invitation_id
                    ? {
                        ...row,
                        name: saved.name,
                        phone: saved.phone,
                        rsvp_status: saved.rsvp_status,
                        party_size: saved.party_size,
                        attendance_mode: saved.attendance_mode,
                        responded_at: saved.responded_at,
                      }
                    : row,
                )
              : prev,
          )
        }
      />

      <ExportFallbackDialog
        open={fallbackOpen}
        onOpenChange={setFallbackOpen}
        filename={fallback?.filename ?? "guests.csv"}
        text={fallback?.text ?? ""}
        title="Guest list export"
      />
    </div>

  );
}
