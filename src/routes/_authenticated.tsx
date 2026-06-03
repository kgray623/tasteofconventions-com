import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

const protectedPrefixes = ["/admin", "/dashboard", "/invitations"];

function safeLoginRedirect(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    ? pathname
    : "/admin";
}

function AuthLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (loading || user) return;
    let cancelled = false;
    setVerifying(true);
    // Double-check via getUser() before redirecting — when returning to the
    // tab from another app (e.g. Messages), AuthProvider may not have
    // re-hydrated yet. Retry briefly before giving up so we don't bounce
    // the user to /login mid-session.
    void (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        const { data } = await supabase.auth
          .getUser()
          .catch(() => ({ data: { user: null } as { user: null } }));
        if (cancelled) return;
        if (data.user) {
          setVerifying(false);
          return;
        }
        // Wait a moment for onAuthStateChange to hydrate from storage.
        await new Promise((r) => setTimeout(r, 400));
      }
      if (cancelled) return;
      const search = new URLSearchParams({ redirect: safeLoginRedirect(location.pathname) });
      await navigate({ to: "/login", search: { redirect: safeLoginRedirect(location.pathname) } as never, replace: true })
        .catch(() => {
          window.location.replace(`/login?${search.toString()}`);
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, location.pathname, navigate]);

  if (loading || (verifying && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Opening login…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Outlet />
    </div>
  );
}
