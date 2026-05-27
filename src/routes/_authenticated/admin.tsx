import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRoles } from "@/hooks/use-roles";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Users, ListChecks, Upload, MessagesSquare, LogOut, UserPlus, UtensilsCrossed, Mail, HandCoins, CalendarCog, MessageSquare, Ticket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — A Taste of Special Conventions" }] }),
  component: AdminLayout,
});

const tabs: { to: string; label: string; icon: typeof ShieldCheck; exact?: boolean; team?: boolean; teamLabel?: string }[] = [
  { to: "/admin", label: "Overview", icon: ShieldCheck, exact: true },
  { to: "/admin/event", label: "Event details", icon: CalendarCog },
  { to: "/admin/invitation", label: "Invitation page", icon: Mail },
  { to: "/admin/upload", label: "Add guests", icon: Upload, team: true, teamLabel: "Guest list" },
  { to: "/admin/committee-message", label: "Committee message", icon: MessageSquare },
  { to: "/admin/inviters", label: "Inviters", icon: UserPlus },
  { to: "/admin/restaurants", label: "Restaurants", icon: UtensilsCrossed },
  { to: "/admin/categories", label: "Assignments", icon: ListChecks, team: true, teamLabel: "Duties" },
  { to: "/admin/donations", label: "Donations", icon: HandCoins },
  { to: "/admin/team", label: "Committee", icon: Users, team: true, teamLabel: "Volunteers" },
  { to: "/admin/chat", label: "Committee chat", icon: MessagesSquare, team: true, teamLabel: "Chat" },
  { to: "/my-rsvp", label: "My RSVP", icon: Ticket, team: true },
];

const teamAllowedPaths = new Set(["/admin", "/admin/upload", "/admin/categories", "/admin/team", "/admin/chat"]);

function AdminLayout() {
  const { isAdmin, isTeam, loading } = useRoles();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out.");
    navigate({ to: "/" });
  };

  // Check if any admin already exists in the system; if so, redirect non-team
  // users to their RSVP page instead of showing the master-admin claim flow.
  useEffect(() => {
    if (loading || isTeam) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if (cancelled) return;
      if ((count ?? 0) > 0) {
        navigate({ to: "/my-rsvp" });
      }
    })();
    return () => { cancelled = true; };
  }, [loading, isTeam, navigate]);

  useEffect(() => {
    if (loading || isAdmin || !isTeam || teamAllowedPaths.has(path)) return;
    navigate({ to: "/admin" });
  }, [loading, isAdmin, isTeam, path, navigate]);

  if (loading) {
    return <div className="mx-auto max-w-6xl px-6 py-10 text-muted-foreground">Loading…</div>;
  }

  if (!isTeam) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center space-y-6">
        <ShieldCheck className="w-12 h-12 mx-auto text-terracotta" />
        <h1 className="font-display text-3xl">Welcome</h1>
        <p className="text-muted-foreground">
          Taking you to your RSVP…
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => navigate({ to: "/my-rsvp" })} className="bg-ink text-cream hover:bg-ink/90">
            Go to my RSVP
          </Button>
          <Button onClick={signOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" /> Log out
          </Button>
        </div>
      </div>
    );
  }

  if (isTeam && !isAdmin && !teamAllowedPaths.has(path)) {
    return <div className="mx-auto max-w-6xl px-6 py-10 text-muted-foreground">Opening committee workspace…</div>;
  }

  const visibleTabs = tabs.filter((t) => isAdmin || t.team);
  const headingEyebrow = isAdmin ? "Event admin" : "Steering Committee member";
  const headingTitle = isAdmin ? "Master control" : "Steering Committee workspace";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">{headingEyebrow}</p>
          <h1 className="font-display text-3xl mt-1">{headingTitle}</h1>
        </div>
        <Button onClick={signOut} variant="outline" size="sm">
          <LogOut className="w-4 h-4 mr-2" /> Log out
        </Button>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-border mb-8">
        {visibleTabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition ${
                active
                  ? "border-terracotta text-ink font-medium"
                  : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
