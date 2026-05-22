import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: location.pathname } });
  }, [user, loading, navigate, location.pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
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
