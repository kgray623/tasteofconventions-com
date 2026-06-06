import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { markExplicitSignOut, useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user } = useAuth();
  const { isAdmin, isTeam, loading } = useRoles();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const isCommitteeView = location.pathname.startsWith("/admin") && (location.pathname === "/admin/subcommittee" || location.search.view === "committee");

  const signOut = async () => {
    markExplicitSignOut();
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-end">
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              {loading ? null : isTeam ? (
                <Link
                  to={isCommitteeView ? "/admin/subcommittee" : "/admin"}
                  className="px-3 py-2 rounded-md hover:bg-secondary transition"
                >
                  {isAdmin && !isCommitteeView ? "Admin" : "Steering Committee"}
                </Link>
              ) : (
                <Link to="/my-rsvp" className="px-3 py-2 rounded-md hover:bg-secondary transition">
                  My RSVP
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>Log out</Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm" className="bg-ink text-cream hover:bg-ink/90">Log in</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
