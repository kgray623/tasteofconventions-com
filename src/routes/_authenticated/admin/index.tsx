import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { CommitteeWorkspace } from "@/components/committee-workspace";
import { NewBadge } from "@/components/new-badge";
import { markSeen } from "@/lib/whats-new";
import { getAdminAudit, getReconciliationRows, type AudienceTotals } from "@/lib/admin-audit.functions";
import { RsvpTotalsCard } from "@/components/rsvp-totals-card";
import { ExternalLink, User, Users, Download, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

const emptyTotals = (): AudienceTotals => ({
  guests_uploaded: 0, sms_sent: 0,
  confirmed_in_person: 0, confirmed_zoom: 0, confirmed_total: 0,
  declined: 0, maybe: 0, waitlist: 0, pending: 0,
  rsvp_records: 0,
  preorder_rows: 0, meals_total: 0, meals_by_cuisine: {}, unlinked_preorders: 0,
});

type AuditData = {
  all: AudienceTotals;
  reconciliation: {
    invitations_total: number;
    duplicate_rsvp_invitations: number;
    orphan_rsvps: number;
    duplicate_guest_pairs: number;
    unlinked_preorders: { id: string; name: string; phone: string; meals: number }[];
  };
};

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function AdminOverview() {
  const { view } = useSearch({ from: "/_authenticated/admin" });
  const { isAdmin, loading: rolesLoading } = useRoles();
  const fetchAudit = useServerFn(getAdminAudit);
  const fetchRecon = useServerFn(getReconciliationRows);
  const [showCommitteePreview, setShowCommitteePreview] = useState(view === "committee");
  const [sampleGuestToken, setSampleGuestToken] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [ops, setOps] = useState({ flags: 0, categories: 0 });
  const loadingAdminDataRef = useRef(false);

  useEffect(() => {
    if (rolesLoading || !isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("invitations")
        .select("rsvp_token")
        .eq("is_committee", false)
        .not("rsvp_token", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSampleGuestToken((data?.rsvp_token as string | null) ?? null);
    })();
  }, [rolesLoading, isAdmin]);

  useEffect(() => {
    if (rolesLoading || !isAdmin) return;
    let alive = true;
    const loadAdminData = async () => {
      if (loadingAdminDataRef.current) return;
      loadingAdminDataRef.current = true;
      try {
        const result = (await fetchAudit()) as AuditData;
        if (!alive) return;
        setAudit(result);
        setAuditError(null);
      } catch (e) {
        if (alive) setAuditError(e instanceof Error ? e.message : "Could not load audit");
      }
      const [flagsRes, catsRes] = await Promise.all([
        supabase.from("duplicate_flag_pairs").select("invitation_a", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
      ]);
      if (alive) setOps({ flags: flagsRes.count ?? 0, categories: catsRes.count ?? 0 });
      loadingAdminDataRef.current = false;
    };
    void loadAdminData();
    const interval = window.setInterval(() => void loadAdminData(), 30000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [rolesLoading, isAdmin, fetchAudit]);

  useEffect(() => {
    setShowCommitteePreview(view === "committee");
  }, [view]);

  if (rolesLoading) return <p className="text-muted-foreground">Loading workspace…</p>;
  if (!isAdmin || showCommitteePreview) return <CommitteeWorkspace />;

  const all = audit?.all ?? emptyTotals();
  const recon = audit?.reconciliation;

  const downloadReconciliation = async () => {
    setDownloading(true);
    try {
      const { rows } = (await fetchRecon()) as { rows: Record<string, unknown>[] };
      const headers = [
        "name", "phone", "email", "audience", "sms_sent",
        "rsvp_status", "party_size", "attendance_mode", "ordering_food",
        "responded_at", "preorder_selections", "preorder_meals",
      ];
      const lines = [headers.join(",")];
      for (const row of rows) {
        lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
      }
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  type Row = { label: string; value: number | string; to?: string; newKey?: "admin:rsvps-tile"; emphasis?: boolean };
  const StatRow = ({ row }: { row: Row }) => {
    const inner = (
      <>
        <span className="flex items-center gap-1.5 text-sm">
          {row.newKey && <NewBadge target={row.newKey} />}
          {row.label}
        </span>
        <span className={`font-display tabular-nums ${row.emphasis ? "text-xl" : "text-lg"}`}>{row.value}</span>
      </>
    );
    if (!row.to) {
      return <div className="flex items-center justify-between py-1.5 px-2 -mx-2">{inner}</div>;
    }
    return (
      <Link
        to={row.to}
        onClick={() => row.newKey && markSeen(row.newKey)}
        className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted/60 transition"
      >
        {inner}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Preview dashboards
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!sampleGuestToken}
            title={sampleGuestToken ? "Opens a real guest's RSVP page" : "No guest invitations yet"}
            onClick={() => {
              if (sampleGuestToken) {
                window.open(`/rsvp/${sampleGuestToken}`, "_blank", "noopener");
              }
            }}
          >
            <User className="w-4 h-4 mr-2" />
            View as Guest
            <ExternalLink className="w-3 h-3 ml-2 opacity-60" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCommitteePreview(true)}
          >
            <Users className="w-4 h-4 mr-2" />
            View as Committee
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadReconciliation}
            disabled={downloading}
          >
            <Download className="w-4 h-4 mr-2" />
            {downloading ? "Preparing…" : "Reconciliation CSV"}
          </Button>
        </div>
      </Card>

      {auditError && (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <p className="text-sm">Audit failed to load: {auditError}</p>
        </Card>
      )}

      <RsvpTotalsCard />

      <Card className="p-5 space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Guests</p>
        <StatRow row={{ label: "Guests uploaded", value: all.guests_uploaded, to: "/admin/upload", emphasis: true }} />
        <StatRow row={{ label: "SMS sent", value: all.sms_sent, to: "/admin/upload" }} />
        <div className="border-t my-2" />
        <StatRow row={{ label: "Confirmed in person", value: all.confirmed_in_person, to: "/admin/my-rsvp", emphasis: true }} />
        <StatRow row={{ label: "Confirmed on Zoom", value: all.confirmed_zoom, to: "/admin/my-rsvp" }} />
        <StatRow row={{ label: "Total confirmed", value: all.confirmed_total, to: "/admin/my-rsvp", emphasis: true }} />
        <StatRow row={{ label: "Declined", value: all.declined, to: "/admin/my-rsvp" }} />
        {all.maybe > 0 && <StatRow row={{ label: "Maybe", value: all.maybe, to: "/admin/my-rsvp" }} />}
        {all.waitlist > 0 && <StatRow row={{ label: "Waitlist", value: all.waitlist, to: "/admin/my-rsvp" }} />}
        <StatRow row={{ label: "Pending", value: all.pending, to: "/admin/my-rsvp" }} />
      </Card>

      <Card className="p-5 space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Food orders</p>
        <StatRow row={{ label: "Meals ordered", value: all.meals_total, to: "/admin/preorders", emphasis: true }} />
        {Object.entries(all.meals_by_cuisine).sort(([a],[b]) => a.localeCompare(b)).map(([cuisine, qty]) => (
          <StatRow key={cuisine} row={{ label: cuisine, value: qty, to: "/admin/preorders" }} />
        ))}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Reconciliation</p>
          <StatRow row={{ label: "Invitations on file", value: recon?.invitations_total ?? 0, emphasis: true }} />
          <StatRow row={{ label: "RSVP records", value: all.rsvp_records, to: "/admin/my-rsvp" }} />
          <StatRow row={{ label: "Duplicate guest pairs", value: recon?.duplicate_guest_pairs ?? 0, to: "/dashboard" }} />
          {(recon?.duplicate_rsvp_invitations ?? 0) > 0 && (
            <StatRow row={{ label: "Duplicate RSVP rows", value: recon?.duplicate_rsvp_invitations ?? 0 }} />
          )}
          {(recon?.orphan_rsvps ?? 0) > 0 && (
            <StatRow row={{ label: "Orphan RSVPs (no invitation)", value: recon?.orphan_rsvps ?? 0 }} />
          )}
          {recon && recon.unlinked_preorders.length > 0 && (
            <>
              <StatRow row={{ label: "Unlinked food orders", value: recon.unlinked_preorders.length, to: "/admin/preorders" }} />
              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="flex items-center gap-2 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  These food orders are not linked to an invitation
                </div>
                <ul className="text-sm space-y-1">
                  {recon.unlinked_preorders.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span className="truncate">{p.name} <span className="text-muted-foreground">· {p.phone}</span></span>
                      <span className="tabular-nums text-muted-foreground">{p.meals} meal{p.meals === 1 ? "" : "s"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </Card>

        <Card className="p-5 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Operations</p>
          <StatRow row={{ label: "Volunteer categories", value: ops.categories, to: "/admin/categories" }} />
          <div className="border-t my-2" />
          <StatRow row={{ label: "Audit log", value: "→", to: "/admin/audit-log" }} />
          <StatRow row={{ label: "Recently deleted", value: "→", to: "/admin/recently-deleted" }} />
        </Card>
      </div>
    </div>
  );
}
