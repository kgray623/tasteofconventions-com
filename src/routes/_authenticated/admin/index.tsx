import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useRoles } from "@/hooks/use-roles";
import { CommitteeWorkspace } from "@/components/committee-workspace";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function SubcommitteeRedirect() {
  return <Navigate to="/admin/subcommittee" replace />;
}

function AdminOverview() {
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [counts, setCounts] = useState({
    invites: 0,
    flags: 0,
    categories: 0,
    team: 0,
    pending: 0,
    preorders: 0,
  });

  useEffect(() => {
    if (rolesLoading || !isAdmin) return;
    (async () => {
      const [i, f, c, t, p, pre] = await Promise.all([
        supabase.from("invitations").select("id", { count: "exact", head: true }),
        supabase.from("duplicate_flags").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .in("role", ["admin", "team"]),
        supabase
          .from("team_invites")
          .select("id", { count: "exact", head: true })
          .is("accepted_at", null),
        supabase.from("cuisine_preorders").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        invites: i.count ?? 0,
        flags: f.count ?? 0,
        categories: c.count ?? 0,
        team: t.count ?? 0,
        pending: p.count ?? 0,
        preorders: pre.count ?? 0,
      });
    })();
  }, [rolesLoading, isAdmin]);

  const stats = [
    { label: "Guest invitations", value: counts.invites, to: "/admin/upload" },
    { label: "Duplicate flags", value: counts.flags, to: "/dashboard" },
    { label: "Categories", value: counts.categories, to: "/admin/categories" },
    { label: "Committee members", value: counts.team, to: "/admin/team" },
    { label: "Pending invites", value: counts.pending, to: "/admin/team" },
    { label: "Food preorders", value: counts.preorders, to: "/admin/preorders" },
  ] as const;

  if (rolesLoading) return <p className="text-muted-foreground">Loading workspace…</p>;

  if (!isAdmin) return <CommitteeWorkspace />;

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
