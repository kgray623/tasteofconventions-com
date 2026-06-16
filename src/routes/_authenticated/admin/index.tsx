import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useRoles } from "@/hooks/use-roles";
import { CommitteeWorkspace } from "@/components/committee-workspace";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { view } = useSearch({ from: "/_authenticated/admin" });
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [counts, setCounts] = useState({
    invites: 0,
    flags: 0,
    categories: 0,
    team: 0,
    pending: 0,
    preorders: 0,
    rsvps: 0,
  });

  useEffect(() => {
    if (rolesLoading || !isAdmin) return;
    (async () => {
      const [i, f, c, ti, cg, inv, rsvpRows, pre] = await Promise.all([
        supabase.from("invitations").select("id", { count: "exact", head: true }),
        supabase.from("duplicate_flags").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("team_invites").select("phone,name"),
        supabase.from("invitations").select("guest_phone,guest_name").eq("is_committee", true),
        supabase.from("inviters").select("phone,name").eq("active", true),
        supabase.from("rsvps").select("invitation_id"),
        supabase.from("cuisine_preorders").select("selections"),
      ]);
      const norm = (v?: string | null) => (v ? v.replace(/\D/g, "") : "");
      const keys = new Set<string>();
      const add = (phone?: string | null, name?: string | null) => {
        const d = norm(phone);
        const k = d.length >= 10 ? d.slice(-10) : (name?.trim().toLowerCase() ?? "");
        if (k) keys.add(k);
      };
      const teamInviteRows = (ti.data ?? []) as Array<{
        phone?: string | null;
        name?: string | null;
      }>;
      const committeeRows = (cg.data ?? []) as Array<{
        guest_phone?: string | null;
        guest_name?: string | null;
      }>;
      const inviterRows = (inv.data ?? []) as Array<{
        phone?: string | null;
        name?: string | null;
      }>;
      const rsvps = (rsvpRows.data ?? []) as Array<{ invitation_id?: string | null }>;
      teamInviteRows.forEach((r) => add(r.phone, r.name));
      committeeRows.forEach((r) => add(r.guest_phone, r.guest_name));
      inviterRows.forEach((r) => add(r.phone, r.name));
      const respondedInvitationIds = new Set(
        rsvps.map((r) => r.invitation_id).filter((id): id is string => Boolean(id)),
      );
      const totalInvitations = i.count ?? 0;
      setCounts({
        invites: totalInvitations,
        flags: f.count ?? 0,
        categories: c.count ?? 0,
        team: keys.size,
        pending: Math.max(0, totalInvitations - respondedInvitationIds.size),
        rsvps: rsvps.length,
        preorders: ((pre.data ?? []) as Array<{ selections?: unknown[] | null }>).reduce(
          (sum, row) => {
            if (!Array.isArray(row.selections)) return sum;
            return (
              sum +
              row.selections.reduce((s: number, item) => {
                if (!item || typeof item !== "object") return s;
                const key =
                  String((item as { cuisine?: unknown }).cuisine ?? "").trim() ||
                  String((item as { country?: unknown }).country ?? "").trim();
                if (!key) return s;
                const qty = Number((item as { qty?: unknown }).qty);
                return s + (Number.isFinite(qty) && qty > 0 ? Math.round(qty) : 0);
              }, 0)
            );
          },
          0,
        ),
      });
    })();
  }, [rolesLoading, isAdmin]);

  const stats = [
    { label: "Guest invitations", value: counts.invites, to: "/admin/upload" },
    { label: "Duplicate flags", value: counts.flags, to: "/dashboard" },
    { label: "Volunteer categories", value: counts.categories, to: "/admin/categories" },
    { label: "Committee members", value: counts.team, to: "/admin/team" },
    { label: "Pending invites", value: counts.pending, to: "/admin/team" },
    { label: "RSVPs", value: counts.rsvps, to: "/admin/my-rsvp" },
    { label: "Food items ordered", value: counts.preorders, to: "/admin/preorders" },
    { label: "Audit log", value: 0, to: "/admin/audit-log" },
  ] as const;

  if (rolesLoading) return <p className="text-muted-foreground">Loading workspace…</p>;

  if (!isAdmin || view === "committee") return <CommitteeWorkspace />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Card className="p-5 hover:border-terracotta transition">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="font-display text-3xl mt-2">{s.value}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
