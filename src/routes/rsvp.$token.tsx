import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getInvitationByToken, submitRsvp, submitOrder } from "@/lib/invitations.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, MapPin, Check, X, Minus, Plus, ArrowLeft } from "lucide-react";
import { InvitationPage } from "@/components/invitation-page";
import { withTimeout } from "@/lib/async-safety";

export const Route = createFileRoute("/rsvp/$token")({
  head: () => ({ meta: [{ title: "Your invitation — RSVP" }] }),
  component: RsvpPage,
});

type R = { id: string; name: string; cuisine: string | null };
type M = { id: string; restaurant_id: string; name: string; description: string | null; price: number };

function RsvpPage() {
  const { token } = useParams({ from: "/rsvp/$token" });
  const fetchInv = useServerFn(getInvitationByToken);
  const submit = useServerFn(submitRsvp);
  const order = useServerFn(submitOrder);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"yes" | "no">("yes");
  const [partySize, setPartySize] = useState(1);
  const [invitedBy, setInvitedBy] = useState("");
  const [invitedByOther, setInvitedByOther] = useState("");
  const [inviters, setInviters] = useState<{ id: string; name: string }[]>([]);
  const [restaurants, setRestaurants] = useState<R[]>([]);
  const [menu, setMenu] = useState<M[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState("");

  useEffect(() => {
    let alive = true;
    const fallback = window.setTimeout(() => {
      if (alive) setLoading(false);
    }, 10000);
    (async () => {
      try {
        const r = await withTimeout(fetchInv({ data: { token } }), 10000);
        if (!alive) return;
        setData(r);
        if (r.rsvp) {
          setStatus(r.rsvp.status === "yes" ? "yes" : "no");
          setPartySize(r.rsvp.party_size);
          setInvitedBy(r.rsvp.invited_by ?? "");
        }
      } finally { if (alive) setLoading(false); }
      const [{ data: rs }, { data: ms }, { data: iv }] = await withTimeout(Promise.all([
        supabase.from("restaurants").select("id,name,cuisine").eq("active", true),
        supabase.from("menu_items").select("id,restaurant_id,name,description,price").eq("available", true),
        supabase.from("inviters").select("id,name").eq("active", true).order("name"),
      ]), 10000);
      if (!alive) return;
      setRestaurants(rs ?? []);
      setMenu((ms as M[]) ?? []);
      setInviters(iv ?? []);
      if (rs?.[0]) setRestaurantId(rs[0].id);
    })().catch(() => {
      if (alive) setLoading(false);
    }).finally(() => window.clearTimeout(fallback));
    return () => {
      alive = false;
      window.clearTimeout(fallback);
    };
  }, [token, fetchInv]);

  const handleSubmit = async () => {
    try {
      const finalInvitedBy = invitedBy === "__other__" ? invitedByOther.trim() : invitedBy;
      await submit({ data: { token, status, party_size: partySize, dietary_notes: "", invited_by: finalInvitedBy } });
      toast.success("RSVP saved — thank you!");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleOrder = async () => {
    const items = menu.filter((m) => m.restaurant_id === restaurantId && cart[m.id] > 0)
      .map((m) => ({ menu_item_id: m.id, name: m.name, price: Number(m.price), quantity: cart[m.id] }));
    if (items.length === 0) return toast.error("Add at least one item");
    try {
      await order({ data: { token, restaurant_id: restaurantId, items, notes: orderNotes } });
      toast.success("Order placed");
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!data?.invitation) return <InvitationPage />;
  const ev = data.invitation.events;
  const restaurantMenu = menu.filter((m) => m.restaurant_id === restaurantId);
  const orderTotal = restaurantMenu.reduce((s, m) => s + (cart[m.id] ?? 0) * Number(m.price), 0);

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-ink">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to invitation
        </Link>
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">You're invited</p>
          <h1 className="font-display text-5xl mt-3 text-ink">{ev.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">Hello, {data.invitation.guest_name}</p>
        </div>

        <Card className="p-7 space-y-3">
          {ev.description && <p className="text-muted-foreground">{ev.description}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" />{new Date(ev.starts_at).toLocaleString()}</span>
            {ev.location && <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" />{ev.location}</span>}
          </div>
          <div className="rounded-md border border-border bg-cream/40 p-4 text-sm space-y-1">
            <p><strong>Name:</strong> {data.invitation.guest_name}</p>
            {data.invitation.guest_email && <p><strong>Email:</strong> {data.invitation.guest_email}</p>}
            {data.invitation.guest_phone && <p><strong>Phone:</strong> {data.invitation.guest_phone}</p>}
          </div>
        </Card>

        {data.rsvp && (
          <Card className="p-5 border-2 border-ink/20 bg-cream/50">
            <p className="text-xs uppercase tracking-[0.25em] text-terracotta mb-1">Your current RSVP</p>
            <p className="font-display text-2xl text-ink">
              {data.rsvp.status === "yes" ? "✓ Attending" : "✗ Declined"}
              {data.rsvp.status === "yes" && <span className="text-base font-sans text-muted-foreground"> · party of {data.rsvp.party_size}</span>}
            </p>
            {data.rsvp.invited_by && <p className="text-sm text-muted-foreground mt-1">Invited by {data.rsvp.invited_by}</p>}
            <p className="text-xs text-muted-foreground mt-2">You can update your response below at any time.</p>
          </Card>
        )}

        <Card className="p-7 space-y-5">
          <h2 className="font-display text-2xl">Will you join us?</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "yes", icon: Check, label: "Attending" },
              { v: "no", icon: X, label: "Decline" },

            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setStatus(o.v as any)}
                className={`p-4 rounded-md border-2 transition flex flex-col items-center gap-2 ${
                  status === o.v ? "border-ink bg-ink text-cream" : "border-border bg-card hover:border-ink/40"
                }`}
              >
                <o.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{o.label}</span>
              </button>
            ))}
          </div>
          {status !== "no" && (
            <div className="space-y-1.5">
              <Label>Party size</Label>
              <div className="flex items-center gap-3">
                <Button size="icon" variant="outline" onClick={() => setPartySize(Math.max(1, partySize - 1))}><Minus className="w-4 h-4" /></Button>
                <span className="font-display text-2xl w-10 text-center">{partySize}</span>
                <Button size="icon" variant="outline" onClick={() => setPartySize(Math.min(20, partySize + 1))}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="invited-by">Invited by</Label>
            <Select value={invitedBy || undefined} onValueChange={setInvitedBy}>
              <SelectTrigger id="invited-by"><SelectValue placeholder="Select who invited you" /></SelectTrigger>
              <SelectContent>
                {inviters.map((i) => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
                <SelectItem value="__other__">Other…</SelectItem>
              </SelectContent>
            </Select>
            {invitedBy === "__other__" && (
              <Input
                className="mt-2"
                value={invitedByOther}
                onChange={(e) => setInvitedByOther(e.target.value)}
                placeholder="Type the name of the person who invited you"
              />
            )}
          </div>
          <Button onClick={handleSubmit} className="bg-ink text-cream hover:bg-ink/90 w-full">Save RSVP</Button>
        </Card>

        {status === "yes" && restaurants.length > 0 && (
          <Card className="p-7 space-y-5">
            <div>
              <h2 className="font-display text-2xl">Pre-order from your cultural choice restaurant</h2>
              <p className="text-sm text-muted-foreground mt-1">Browse each kitchen's digital menu and choose what you'd like that evening.</p>
            </div>
            <Select value={restaurantId} onValueChange={(v) => { setRestaurantId(v); setCart({}); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}{r.cuisine ? ` · ${r.cuisine}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            {restaurantMenu.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No items yet for this restaurant.</p>
            ) : (
              <div className="divide-y divide-border">
                {restaurantMenu.map((m) => (
                  <div key={m.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{m.name}</p>
                      {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                    </div>
                    <span className="font-display text-lg w-16 text-right">${Number(m.price).toFixed(2)}</span>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={() => setCart({ ...cart, [m.id]: Math.max(0, (cart[m.id] ?? 0) - 1) })}><Minus className="w-3 h-3" /></Button>
                      <span className="w-6 text-center">{cart[m.id] ?? 0}</span>
                      <Button size="icon" variant="outline" onClick={() => setCart({ ...cart, [m.id]: Math.min(10, (cart[m.id] ?? 0) + 1) })}><Plus className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Special requests" />
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl">Total: ${orderTotal.toFixed(2)}</span>
              <Button onClick={handleOrder} className="bg-terracotta text-cream hover:bg-terracotta/90">Place order</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
