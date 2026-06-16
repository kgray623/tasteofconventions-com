import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { CommitteeWorkspace } from "@/components/committee-workspace";
import { NewBadge } from "@/components/new-badge";
import { markSeen } from "@/lib/whats-new";
import { ExternalLink, User, Users, Shield } from "lucide-react";


export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

type BucketCounts = {
  uploaded: number;
  sent: number;
  yes: number;
  no: number;
  maybe: number;
  waitlist: number;
  pending: number;
};

const emptyBucket = (): BucketCounts => ({
  uploaded: 0, sent: 0, yes: 0, no: 0, maybe: 0, waitlist: 0, pending: 0,
});

function AdminOverview() {
  const { view } = useSearch({ from: "/_authenticated/admin" });
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [sampleGuestToken, setSampleGuestToken] = useState<string | null>(null);
  const [guests, setGuests] = useState<BucketCounts>(emptyBucket);
  const [committee, setCommittee] = useState<BucketCounts>(emptyBucket);
  const [ops, setOps] = useState({ flags: 0, categories: 0, preorders: 0 });

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
    (async () => {
      const [invRes, rsvpRes, flagsRes, catsRes, preRes] = await Promise.all([
        supabase.from("invitations").select("id,is_committee,invite_sent_at"),
        supabase.from("rsvps").select("invitation_id,status"),
        supabase.from("duplicate_flag_pairs").select("invitation_a", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("cuisine_preorders").select("selections"),
      ]);

      type InvRow = { id: string; is_committee: boolean; invite_sent_at: string | null };
      type RsvpRow = { invitation_id: string; status: string };
      const invs = (invRes.data ?? []) as InvRow[];
      const rsvps = (rsvpRes.data ?? []) as RsvpRow[];

      const statusByInv = new Map<string, string>();
      rsvps.forEach((r) => statusByInv.set(r.invitation_id, r.status));

      const g = emptyBucket();
      const c = emptyBucket();
      for (const inv of invs) {
        const bucket = inv.is_committee ? c : g;
        bucket.uploaded += 1;
        if (inv.invite_sent_at) bucket.sent += 1;
        const status = statusByInv.get(inv.id);
        if (!status) bucket.pending += 1;
        else if (status === "yes") bucket.yes += 1;
        else if (status === "no") bucket.no += 1;
        else if (status === "maybe") bucket.maybe += 1;
        else if (status === "waitlist") bucket.waitlist += 1;
        else bucket.pending += 1;
      }
      setGuests(g);
      setCommittee(c);

      const preorders = ((preRes.data ?? []) as Array<{ selections?: unknown[] | null }>).reduce(
        (sum, row) => {
          if (!Array.isArray(row.selections)) return sum;
          return sum + row.selections.reduce((s: number, item) => {
            if (!item || typeof item !== "object") return s;
            const key =
              String((item as { cuisine?: unknown }).cuisine ?? "").trim() ||
              String((item as { country?: unknown }).country ?? "").trim();
            if (!key) return s;
            const qty = Number((item as { qty?: unknown }).qty);
            return s + (Number.isFinite(qty) && qty > 0 ? Math.round(qty) : 0);
          }, 0);
        },
        0,
      );

      setOps({
        flags: flagsRes.count ?? 0,
        categories: catsRes.count ?? 0,
        preorders,
      });
    })();
  }, [rolesLoading, isAdmin]);

  if (rolesLoading) return <p className="text-muted-foreground">Loading workspace…</p>;
  if (!isAdmin || view === "committee") return <CommitteeWorkspace />;

  const totalRsvps = (b: BucketCounts) => b.yes + b.no + b.maybe + b.waitlist;

  type Row = { label: string; value: number; to: string; newKey?: "admin:rsvps-tile" };
  const StatRow = ({ row }: { row: Row }) => (
    <Link
      to={row.to}
      onClick={() => row.newKey && markSeen(row.newKey)}
      className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted/60 transition"
    >
      <span className="flex items-center gap-1.5 text-sm">
        {row.newKey && <NewBadge target={row.newKey} />}
        {row.label}
      </span>
      <span className="font-display text-lg tabular-nums">{row.value}</span>
    </Link>
  );

  const audienceCard = (
    title: string,
    b: BucketCounts,
    links: { upload: string; rsvp: string },
  ) => (
    <Card className="p-5 space-y-1">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{title}</p>
      <StatRow row={{ label: "Uploaded", value: b.uploaded, to: links.upload }} />
      <StatRow row={{ label: "SMS sent", value: b.sent, to: links.upload }} />
      <div className="border-t my-2" />
      <StatRow row={{ label: "Yes", value: b.yes, to: links.rsvp }} />
      <StatRow row={{ label: "No", value: b.no, to: links.rsvp }} />
      <StatRow row={{ label: "Maybe", value: b.maybe, to: links.rsvp }} />
      <StatRow row={{ label: "Waitlist", value: b.waitlist, to: links.rsvp }} />
      <StatRow row={{ label: "Pending", value: b.pending, to: links.rsvp }} />
      <div className="border-t my-2" />
      <StatRow
        row={{
          label: "Total RSVPs",
          value: totalRsvps(b),
          to: links.rsvp,
          newKey: title === "Guests" ? "admin:rsvps-tile" : undefined,
        }}
      />
    </Card>
  );

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
            onClick={() => window.open("/dashboard", "_blank", "noopener")}
          >
            <Users className="w-4 h-4 mr-2" />
            View as Committee
            <ExternalLink className="w-3 h-3 ml-2 opacity-60" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/admin", "_blank", "noopener")}
          >
            <Shield className="w-4 h-4 mr-2" />
            View as Admin
            <ExternalLink className="w-3 h-3 ml-2 opacity-60" />
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {audienceCard("Guests", guests, { upload: "/admin/upload", rsvp: "/admin/my-rsvp" })}
        {audienceCard("Committee", committee, { upload: "/admin/team", rsvp: "/admin/my-rsvp" })}

        <Card className="p-5 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Operations</p>
          <StatRow row={{ label: "Duplicate flags", value: ops.flags, to: "/dashboard" }} />
          <StatRow row={{ label: "Volunteer categories", value: ops.categories, to: "/admin/categories" }} />
          <StatRow row={{ label: "Food items ordered", value: ops.preorders, to: "/admin/preorders" }} />
          <div className="border-t my-2" />
          <StatRow row={{ label: "Audit log", value: 0, to: "/admin/audit-log" }} />
          <StatRow row={{ label: "Recently deleted", value: 0, to: "/admin/recently-deleted" }} />
        </Card>
      </div>
    </div>
  );
}
