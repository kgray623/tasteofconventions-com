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
import { Calendar, MapPin, Check, X, HelpCircle, Minus, Plus, ArrowLeft } from "lucide-react";
import { GuestThread } from "@/components/guest-thread";

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
  const [message, setMessage] = useState("");
  const [invitedBy, setInvitedBy] = useState("");
  const [restaurants, setRestaurants] = useState<R[]>([]);
  const [menu, setMenu] = useState<M[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchInv({ data: { token } });
        setData(r);
        if (r.rsvp) {
          setStatus(r.rsvp.status === "yes" ? "yes" : "no");
          setPartySize(r.rsvp.party_size);
          setMessage(r.rsvp.message ?? "");
          setInvitedBy(r.rsvp.invited_by ?? "");
        }
      } finally { setLoading(false); }
      const [{ data: rs }, { data: ms }] = await Promise.all([
        supabase.from("restaurants").select("id,name,cuisine").eq("active", true),
        supabase.from("menu_items").select("id,restaurant_id,name,description,price").eq("available", true),
      ]);
      setRestaurants(rs ?? []);
      setMenu((ms as M[]) ?? []);
      if (rs?.[0]) setRestaurantId(rs[0].id);
    })();
  }, [token, fetchInv]);

  const handleSubmit = async () => {
    try {
      await submit({ data: { token, status, party_size: partySize, dietary_notes: "", message, invited_by: invitedBy } });
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
  if (!data?.invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="p-10 text-center max-w-md">
          <h1 className="font-display text-3xl">Invitation not found</h1>
          <p className="text-muted-foreground mt-2">This link is invalid or has been revoked.</p>
        </Card>
      </div>
    );
  }
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
        </Card>

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
            <Label>Message to the host (optional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
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

        <GuestThread invitationId={data.invitation.id} title="Message the host" />
      </div>
    </div>
  );
}
