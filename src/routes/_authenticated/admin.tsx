import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useRoles } from "@/hooks/use-roles";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Users, ListChecks, Upload, MessagesSquare, Mail, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — A Taste of Special Conventions" }] }),
  component: AdminLayout,
});

const tabs: { to: string; label: string; icon: typeof ShieldCheck; exact?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: ShieldCheck, exact: true },
  { to: "/admin/upload", label: "Upload list", icon: Upload },
  { to: "/admin/categories", label: "Assignments", icon: ListChecks },
  { to: "/admin/team", label: "Team access", icon: Users },
  { to: "/admin/chat", label: "Team chat", icon: MessagesSquare },
  { to: "/admin/messages", label: "Guest messages", icon: Mail },
];

function AdminLayout() {
  const { isAdmin, isTeam, loading, refresh } = useRoles();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const claim = async () => {
    const { data, error } = await supabase.rpc("claim_admin");
    if (error) return toast.error(error.message);
    if (data) { toast.success("You are now the master admin."); refresh(); }
    else toast.info("An admin already exists.");
  };

  if (loading) {
    return <div className="mx-auto max-w-6xl px-6 py-10 text-muted-foreground">Loading…</div>;
  }

  if (!isTeam) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center space-y-6">
        <ShieldCheck className="w-12 h-12 mx-auto text-terracotta" />
        <h1 className="font-display text-3xl">Admin area</h1>
        <p className="text-muted-foreground">
          You don't have admin or team access yet. If this is a brand-new
          backend, claim master admin to get started.
        </p>
        <Button onClick={claim} className="bg-ink text-cream hover:bg-ink/90">
          Claim master admin
        </Button>
      </div>
    );
  }

  const visibleTabs = tabs.filter(
    (t) => isAdmin || t.to === "/admin/chat" || t.to === "/admin/messages" || t.to === "/admin",
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Event admin</p>
          <h1 className="font-display text-3xl mt-1">Master control</h1>
        </div>
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
