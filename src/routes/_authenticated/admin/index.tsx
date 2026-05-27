import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { CalendarCog, ListChecks, MessageSquare, Play, Upload, UserPlus, Utensils, Video } from "lucide-react";

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

  if (!isAdmin || view === "committee") {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-ink/10">
          <div className="relative aspect-video bg-gradient-to-br from-ink/5 to-ink/10 flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-16 h-16 rounded-full bg-ink/5 flex items-center justify-center border border-ink/10">
              <Video className="w-7 h-7 text-ink/40" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-ink/70">Feature Walkthrough</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                A video will be placed here explaining every Steering Committee workspace feature — assignments, guest uploads, committee chat, and event details.
              </p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-ink/[0.03] flex items-center justify-center">
                <Play className="w-8 h-8 text-ink/20 ml-1" />
              </div>
            </div>
          </div>
        </Card>

        <p className="text-muted-foreground">
          Use these committee tools to coordinate assignments, add your guests, chat with everyone, and review event details.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild className="bg-ink text-cream hover:bg-ink/90 justify-start h-14">
            <Link to="/admin/categories" search={{ view: "committee" }}>
              <ListChecks className="w-4 h-4" /> Volunteer
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-14">
            <Link to="/admin/upload" search={{ view: "committee" }}>
              <Upload className="w-4 h-4" /> Add guests
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-14">
            <Link to="/admin/chat" search={{ view: "committee" }}>
              <MessageSquare className="w-4 h-4" /> Committee chat
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-14">
            <Link to="/admin/event" search={{ view: "committee" }}>
              <CalendarCog className="w-4 h-4" /> Event details
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-14">
            <Link to="/admin/preorders" search={{ view: "committee" }}>
              <Utensils className="w-4 h-4" /> Food report
            </Link>
          </Button>
        </div>
      </div>
    );
  }

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
