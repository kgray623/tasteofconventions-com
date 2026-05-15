import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { isAdmin } = useRoles();
  const [counts, setCounts] = useState({ invites: 0, flags: 0, categories: 0, team: 0, pending: 0 });

  useEffect(() => {
    (async () => {
      const [i, f, c, t, p] = await Promise.all([
        supabase.from("invitations").select("id", { count: "exact", head: true }),
        supabase.from("duplicate_flags").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).in("role", ["admin", "team"]),
        supabase.from("team_invites").select("id", { count: "exact", head: true }).is("accepted_at", null),
      ]);
      setCounts({
        invites: i.count ?? 0, flags: f.count ?? 0, categories: c.count ?? 0,
        team: t.count ?? 0, pending: p.count ?? 0,
      });
    })();
  }, []);

  const stats = [
    { label: "Guest invitations", value: counts.invites, to: "/admin/upload" },
    { label: "Duplicate flags", value: counts.flags, to: "/dashboard" },
    { label: "Categories", value: counts.categories, to: "/admin/categories" },
    { label: "Team members", value: counts.team, to: "/admin/team" },
    { label: "Pending invites", value: counts.pending, to: "/admin/team" },
  ] as const;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        {isAdmin
          ? "You have full admin access. Manage the guest list, assignments, team, and chat."
          : "You have team access. Use the chat to coordinate with the host team."}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
