import { createFileRoute, Link, Outlet, useRouterState, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useRoles } from "@/hooks/use-roles";
import { markExplicitSignOut, useAuth } from "@/hooks/use-auth";
import { clearPhoneLoginCookie } from "@/lib/auth-phone.functions";
import { Button } from "@/components/ui/button";


import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Users, ListChecks, Upload, MessagesSquare, LogOut, UserPlus, UtensilsCrossed, Mail, HandCoins, MessageSquare, Ticket, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — A Taste of Special Conventions" }] }),
  validateSearch: (s) => z.object({ view: z.enum(["committee"]).optional() }).parse(s),
  component: AdminLayout,
});

const tabs: { to: string; label: string; icon: typeof ShieldCheck; exact?: boolean; team?: boolean; teamLabel?: string; group: "main" | "committee" }[] = [
  { to: "/admin", label: "Overview", icon: ShieldCheck, exact: true, group: "main" },
  { to: "/admin/invitation", label: "Invitation page", icon: Mail, group: "main" },
  { to: "/admin/donations", label: "Donations", icon: HandCoins, group: "main" },
  { to: "/admin/my-rsvp", label: "My RSVP", icon: Ticket, team: true, group: "main" },
  { to: "/admin/restaurants", label: "Restaurants", icon: UtensilsCrossed, group: "main" },
  { to: "/admin/upload", label: "Add guests", icon: Upload, team: true, teamLabel: "Guest list", group: "committee" },
  { to: "/admin/committee-message", label: "Committee SMS", icon: MessageSquare, group: "committee" },
  { to: "/admin/inviters", label: "Committee", icon: UserPlus, team: true, teamLabel: "Committee", group: "committee" },
  { to: "/admin/categories", label: "Assignments", icon: ListChecks, team: true, teamLabel: "Volunteer", group: "committee" },
  { to: "/admin/team", label: "Team access", icon: Users, group: "committee" },
  { to: "/admin/chat", label: "Team chat", icon: MessagesSquare, team: true, teamLabel: "Team chat", group: "committee" },
];


const teamAllowedPrefixes = ["/admin/subcommittee", "/admin/upload", "/admin/inviters", "/admin/categories", "/admin/chat", "/admin/my-rsvp", "/admin/preorders"];
const isTeamAllowedPath = (path: string) =>
  path === "/admin" || teamAllowedPrefixes.some((p) => path === p || path.startsWith(p + "/"));

function AdminLayout() {
  const { isAdmin: isActualAdmin, isTeam, loading } = useRoles();
  const { user } = useAuth();
  const search = useSearch({ from: "/_authenticated/admin" });
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isCommitteeRoute = path === "/admin/subcommittee";
  const previewCommittee = isActualAdmin && (search.view === "committee" || isCommitteeRoute);
  const isAdmin = isActualAdmin && !previewCommittee;
  const navigate = useNavigate();
  const clearRememberedLogin = useServerFn(clearPhoneLoginCookie);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (!user?.id) { setDisplayName(""); return; }
    let alive = true;
    void (async () => {
      const { data } = await supabase.from("profiles").select("display_name,email").eq("id", user.id).maybeSingle();
      if (!alive) return;
      const fromProfile = data?.display_name?.trim();
      const fromMeta = (user.user_metadata?.display_name as string | undefined)?.trim();
      const fromEmail = (data?.email || user.email || "").split("@")[0];
      const full = fromProfile || fromMeta || fromEmail || "";
      setDisplayName(full.split(" ")[0] || full);
    })();
    return () => { alive = false; };
  }, [user?.id, user?.email, user?.user_metadata]);

  const signOut = async () => {
    markExplicitSignOut();
    await clearRememberedLogin().catch(() => null);
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
    if (loading || isAdmin || !isTeam || isTeamAllowedPath(path)) return;
    navigate(previewCommittee ? { to: "/admin/subcommittee" } : { to: "/admin" });
  }, [loading, isAdmin, isTeam, path, navigate, previewCommittee]);

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

  if (isTeam && !isAdmin && !isTeamAllowedPath(path)) {
    return <div className="mx-auto max-w-6xl px-6 py-10 text-muted-foreground">Opening committee workspace…</div>;
  }

  const visibleTabs = tabs.filter((t) => isAdmin || t.team);
  const headingEyebrow = isAdmin ? "Event admin" : "Steering Committee";
  const headingTitle = isAdmin
    ? "Admin"
    : `Welcome${displayName ? `, ${displayName}` : ""}`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">{headingEyebrow}</p>
          <h1 className="font-display text-3xl mt-1">{headingTitle}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2" />

      </div>
      {(["main", "committee"] as const).map((group) => {
        const groupTabs = visibleTabs.filter((t) => t.group === group);
        if (groupTabs.length === 0) return null;
        return (
          <nav
            key={group}
            className={`flex flex-wrap gap-1 border-b border-border ${group === "main" ? "mb-2" : "mb-8"}`}
          >
            {groupTabs.map((t) => {
              const active = t.exact ? path === t.to : path.startsWith(t.to);
              const label = !isAdmin && t.teamLabel ? t.teamLabel : t.label;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  search={previewCommittee ? { view: "committee" } : { view: undefined }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition ${
                    active
                      ? "border-terracotta text-ink font-medium"
                      : "border-transparent text-muted-foreground hover:text-ink"
                  }`}
                >
                  <t.icon className="w-4 h-4" /> {label}
                </Link>
              );
            })}
          </nav>
        );
      })}

      {path !== "/admin" && (
        <Link
          to="/admin"
          search={previewCommittee ? { view: "committee" } : { view: undefined }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
      )}
      <Outlet />
    </div>
  );
}
