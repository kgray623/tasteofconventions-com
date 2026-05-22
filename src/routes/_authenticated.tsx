import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";

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

  useEffect(() => {
    if (loading || user) return;
    const search = new URLSearchParams({ redirect: safeLoginRedirect(location.pathname) });
    window.location.replace(`/login?${search.toString()}`);
  }, [loading, user, location.pathname]);

  if (loading) {
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
