import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyInvitation } from "@/lib/invitations.functions";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/my-rsvp")({
  head: () => ({ meta: [{ title: "My RSVP — A Taste of Special Conventions" }] }),
  component: MyRsvpPage,
});

function MyRsvpPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fetchMine = useServerFn(getMyInvitation);
  const [state, setState] = useState<"loading" | "none" | "redirecting">("loading");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchMine();
        if (cancelled) return;
        if (r?.invitation?.rsvp_token) {
          setState("redirecting");
          window.location.replace(`/rsvp/${encodeURIComponent(r.invitation.rsvp_token)}`);
        } else {
          setState("none");
        }
      } catch {
        setState("none");
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading, fetchMine, navigate]);

  if (state === "loading" || state === "redirecting") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading your RSVP…</div>;
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-warm">
      <Card className="p-10 text-center max-w-md space-y-4">
        <h1 className="font-display text-3xl">No RSVP on file</h1>
        <p className="text-muted-foreground">We couldn't find an RSVP linked to <strong>{user?.email}</strong>. Make sure you RSVP'd with the same email.</p>
        <Link to="/rsvp/preview"><Button className="bg-ink text-cream hover:bg-ink/90">RSVP now</Button></Link>
      </Card>
    </div>
  );
}
