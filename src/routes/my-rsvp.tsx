import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyInvitation } from "@/lib/invitations.functions";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Check, X, UtensilsCrossed } from "lucide-react";
import { withTimeout } from "@/lib/async-safety";

export const Route = createFileRoute("/my-rsvp")({
  head: () => ({ meta: [{ title: "My RSVP — A Taste of Special Conventions" }] }),
  component: MyRsvpPage,
});

function MyRsvpPage() {
  const { user, loading } = useAuth();
  const fetchMine = useServerFn(getMyInvitation);
  const [state, setState] = useState<"loading" | "none" | "ready">("loading");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    let cancelled = false;
    const fallback = window.setTimeout(() => {
      if (!cancelled) setState("none");
    }, 10000);
    (async () => {
      try {
        const r = await withTimeout(fetchMine(), 10000);
        if (cancelled) return;
        if (r?.invitation) {
          setData(r);
          setState("ready");
        } else {
          setState("none");
        }
      } catch {
        setState("none");
      } finally {
        window.clearTimeout(fallback);
      }
    })();
    return () => { cancelled = true; window.clearTimeout(fallback); };
  }, [user, loading, fetchMine]);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (state === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading your RSVP…</div>;
  }

  if (state === "ready" && data?.invitation) {
    const invitation = data.invitation;
    const ev = invitation.events;
    const rsvp = data.rsvp;
    const order = data.order;
    const rsvpDone = !!rsvp?.responded_at;
    const rsvpYes = rsvp?.status === "yes";
    const orderItems: Array<{ name?: string; quantity?: number; price?: number }> = Array.isArray(order?.items) ? order.items : [];
    const orderDone = orderItems.length > 0;

    return (
      <div className="min-h-screen bg-gradient-warm px-6 py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-terracotta">My RSVP</p>
            <h1 className="font-display text-4xl sm:text-5xl mt-3 text-ink">Hello, {invitation.guest_name}</h1>
            <p className="mt-2 text-muted-foreground">Your invitation details are loaded from your account.</p>
          </div>

          {/* Bold status badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`rounded-lg border-2 p-5 flex items-center gap-4 ${rsvpDone ? (rsvpYes ? "border-ink bg-ink text-cream" : "border-ink bg-cream text-ink") : "border-dashed border-border bg-card text-muted-foreground"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${rsvpDone ? (rsvpYes ? "bg-cream text-ink" : "bg-ink text-cream") : "bg-muted text-muted-foreground"}`}>
                {rsvpDone ? (rsvpYes ? <Check className="w-6 h-6" strokeWidth={3} /> : <X className="w-6 h-6" strokeWidth={3} />) : <span className="font-display text-xl">?</span>}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-80">RSVP</p>
                <p className="font-display text-2xl leading-tight">
                  {rsvpDone ? (rsvpYes ? "RSVP'd" : "Declined") : "Not yet"}
                </p>
                {rsvpDone && rsvpYes && (
                  <p className="text-xs opacity-90 mt-0.5">
                    {rsvp?.attendance_mode === "zoom" ? "Virtual (Zoom)" : `In person · party of ${rsvp?.party_size ?? 1}`}
                  </p>
                )}
              </div>
            </div>

            <div className={`rounded-lg border-2 p-5 flex items-center gap-4 ${orderDone ? "border-terracotta bg-terracotta text-cream" : "border-dashed border-border bg-card text-muted-foreground"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${orderDone ? "bg-cream text-terracotta" : "bg-muted text-muted-foreground"}`}>
                <UtensilsCrossed className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-80">Pre-order</p>
                <p className="font-display text-2xl leading-tight">
                  {orderDone ? "ORDERED" : "No order yet"}
                </p>
                {orderDone && (
                  <p className="text-xs opacity-90 mt-0.5">
                    {orderItems.reduce((s, i) => s + (i.quantity ?? 0), 0)} item{orderItems.length === 1 ? "" : "s"} · ${Number(order?.total ?? 0).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {orderDone && (
            <Card className="p-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">What you pre-ordered</h2>
                <span className="font-display text-xl text-terracotta">${Number(order?.total ?? 0).toFixed(2)}</span>
              </div>
              <ul className="divide-y divide-border">
                {orderItems.map((it, idx) => (
                  <li key={idx} className="py-2 flex items-center gap-3 text-sm">
                    <span className="font-display text-lg w-8 text-terracotta">{it.quantity ?? 1}×</span>
                    <span className="flex-1 text-ink">{it.name ?? "Item"}</span>
                    <span className="text-muted-foreground">${(Number(it.price ?? 0) * Number(it.quantity ?? 1)).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {order?.notes && (
                <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">Note: {order.notes}</p>
              )}
            </Card>
          )}

          <Card className="p-7 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Event</p>
              <h2 className="font-display text-3xl text-ink mt-1">{ev.title}</h2>
            </div>
            <div className="grid gap-3 text-sm text-ink">
              <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" />{new Date(ev.starts_at).toLocaleString()}</span>
              {ev.location && <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" />{ev.location}</span>}
              <span className="inline-flex items-center gap-2"><Users className="w-4 h-4 text-gold" />{rsvp?.status === "no" ? "Declined" : rsvp?.attendance_mode === "zoom" ? "Attending virtually (Zoom)" : `Attending in person · party of ${rsvp?.party_size ?? 1}${rsvp?.ordering_food === true ? " · ordering food" : rsvp?.ordering_food === false ? " · not ordering food" : ""}`}</span>
            </div>
            <div className="rounded-md border border-border bg-cream/40 p-4 text-sm space-y-2">
              <p><strong>Name:</strong> {invitation.guest_name}</p>
              {invitation.guest_email && <p><strong>Email:</strong> {invitation.guest_email}</p>}
              {invitation.guest_phone && <p><strong>Phone:</strong> {invitation.guest_phone}</p>}
              {rsvp?.invited_by && <p><strong>Invited by:</strong> {rsvp.invited_by}</p>}
            </div>
            <Link to="/rsvp/$token" params={{ token: invitation.rsvp_token }}>
              <Button className="bg-ink text-cream hover:bg-ink/90 w-full">{orderDone ? "Update RSVP or order" : "Update RSVP or place a pre-order"}</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-warm">
      <Card className="p-10 text-center max-w-md space-y-4">
        <h1 className="font-display text-3xl">No RSVP on file</h1>
        <p className="text-muted-foreground">We couldn't find an RSVP linked to your phone number. Make sure your RSVP uses the same phone number as your account.</p>
        <Link to="/rsvp"><Button className="bg-ink text-cream hover:bg-ink/90">RSVP now</Button></Link>
      </Card>
    </div>
  );
}
