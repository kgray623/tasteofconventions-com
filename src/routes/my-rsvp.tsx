import { createFileRoute, Navigate } from "@tanstack/react-router";
import { MyRsvpContent } from "@/components/my-rsvp-content";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/my-rsvp")({
  head: () => ({
    meta: [
      { title: "My RSVP — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "View and manage your personal RSVP details, guest count, and pre-orders for A Taste of Special Conventions.",
      },
    ],
  }),
  component: MyRsvpPage,
});

function MyRsvpPage() {
  const { user, loading: authLoading } = useAuth();
  const { isTeam, loading: rolesLoading } = useRoles();

  if (authLoading || (user && rolesLoading)) {
    return (
      <div className="min-h-screen bg-gradient-warm px-6 py-10 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (user && isTeam) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-warm px-6 py-10">
      <MyRsvpContent />
    </div>
  );
}
