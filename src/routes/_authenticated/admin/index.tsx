import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { CalendarCog, ListChecks, MessageSquare, Play, Upload, UserPlus, Video } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [counts, setCounts] = useState({
    invites: 0,
    flags: 0,
    categories: 0,
    team: 0,
    pending: 0,
  });

  useEffect(() => {
    if (rolesLoading || !isAdmin) return;
    (async () => {
      const [i, f, c, t, p] = await Promise.all([
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
      ]);
      setCounts({
        invites: i.count ?? 0,
        flags: f.count ?? 0,
        categories: c.count ?? 0,
        team: t.count ?? 0,
        pending: p.count ?? 0,
      });
    })();
  }, [rolesLoading, isAdmin]);

  const stats = [
    { label: "Guest invitations", value: counts.invites, to: "/admin/upload" },
    { label: "Duplicate flags", value: counts.flags, to: "/dashboard" },
    { label: "Categories", value: counts.categories, to: "/admin/categories" },
    { label: "Team members", value: counts.team, to: "/admin/team" },
    { label: "Pending invites", value: counts.pending, to: "/admin/team" },
  ] as const;

  if (rolesLoading) return <p className="text-muted-foreground">Loading workspace…</p>;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Use these team tools to coordinate assignments, add your guests, chat with everyone, and review event details.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild className="bg-ink text-cream hover:bg-ink/90 justify-start h-14">
            <Link to="/admin/categories">
              <ListChecks className="w-4 h-4" /> Assignments
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-14">
            <Link to="/admin/upload">
              <Upload className="w-4 h-4" /> Add guests
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-14">
            <Link to="/admin/chat">
              <MessageSquare className="w-4 h-4" /> Team chat
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-14">
            <Link to="/admin/event">
              <CalendarCog className="w-4 h-4" /> Event details
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        You have full admin access. Manage the guest list, assignments, team, and chat.
      </p>
      <Card className="p-5 border-terracotta/30 bg-terracotta/5 space-y-4">
        <div>
          <h2 className="font-display text-xl">Team workspace</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Communicate with the team, see tasks, make invitations, and upload your contacts here.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild className="bg-ink text-cream hover:bg-ink/90 justify-start">
            <Link to="/admin/inviters">
              <UserPlus className="w-4 h-4" /> Team invitations
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link to="/admin/upload">
              <Upload className="w-4 h-4" /> Upload contacts
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link to="/admin/categories">
              <ListChecks className="w-4 h-4" /> Tasks
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link to="/admin/chat">
              <MessageSquare className="w-4 h-4" /> Team chat
            </Link>
          </Button>
        </div>
      </Card>
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
