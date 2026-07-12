import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { getRememberedLoginPhone } from "@/lib/session-recovery";

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
    // Double-check before redirecting. If we have a remembered phone, the
    // AuthProvider is still allowed to rebuild the session, so don't bounce
    // the user to /login just because the browser auth cache was cleared.
    void (async () => {
      for (let attempt = 0; attempt < 8 && !cancelled; attempt++) {
        const { data: sessionData } = await supabase.auth
          .getSession()
          .catch(() => ({ data: { session: null } as { session: null } }));
        if (cancelled) return;
        if (sessionData.session || getRememberedLoginPhone()) {
          setVerifying(false);
          return;
        }

        const { data } = await supabase.auth
          .getUser()
          .catch(() => ({ data: { user: null } as { user: null } }));
        if (cancelled) return;
        if (data.user) {
          setVerifying(false);
          return;
        }
        // Wait a moment for onAuthStateChange to hydrate from storage.
        await new Promise((r) => setTimeout(r, 500));
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
    <div className="min-h-dvh bg-background touch-pan-y">
      <SiteHeader />
      <Outlet />
    </div>
  );
}
