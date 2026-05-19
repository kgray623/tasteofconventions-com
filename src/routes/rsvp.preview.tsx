import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Check, X, HelpCircle, Minus, Plus, Eye, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/rsvp/preview")({
  head: () => ({ meta: [{ title: "Guest RSVP — Preview" }] }),
  component: PreviewPage,
});

const ev = {
  title: "A Taste of Special Conventions",
  description: "An intimate sundown gathering with curated tastings from our four partner kitchens. Dress: garden chic.",
  starts_at: "2026-06-20T18:30:00Z",
  location: "The Conservatory · 412 Vine Street",
};



const restaurants = [
  { id: "r1", name: "Maison Laurent", cuisine: "French" },
  { id: "r2", name: "Sakura House", cuisine: "Japanese" },
  { id: "r3", name: "Olive & Vine", cuisine: "Mediterranean" },
  { id: "r4", name: "Casa Verde", cuisine: "Mexican" },
];

const menu: Record<string, { id: string; name: string; description: string; price: number }[]> = {
  r1: [
    { id: "r1-1", name: "Coq au Vin", description: "Braised chicken in burgundy, pearl onions", price: 32 },
    { id: "r1-2", name: "Tarte Tatin", description: "Caramelized apple, crème fraîche", price: 14 },
  ],
  r2: [
    { id: "r2-1", name: "Omakase Selection", description: "Chef's seven-piece nigiri", price: 48 },
    { id: "r2-2", name: "Matcha Mille-feuille", description: "Layered matcha cream pastry", price: 12 },
  ],
  r3: [
    { id: "r3-1", name: "Lamb Tagine", description: "Slow-braised, preserved lemon, olives", price: 28 },
    { id: "r3-2", name: "Mezze Platter", description: "Hummus, baba ghanoush, warm pita", price: 18 },
  ],
  r4: [
    { id: "r4-1", name: "Mole Negro", description: "Heritage chicken, twenty-spice mole", price: 26 },
    { id: "r4-2", name: "Tres Leches", description: "Vanilla bean, cinnamon cream", price: 11 },
  ],
};

function PreviewPage() {
  const [status, setStatus] = useState<"yes" | "no">("yes");
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [restaurantId, setRestaurantId] = useState("r1");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState("");

  const restaurantMenu = menu[restaurantId] ?? [];
  const orderTotal = restaurantMenu.reduce((s, m) => s + (cart[m.id] ?? 0) * m.price, 0);

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="bg-ink/95 text-cream text-xs px-4 py-2 flex items-center justify-center gap-2">
        <Eye className="w-3.5 h-3.5" />
        <span className="tracking-wide">Guest preview — this is what invitees will see when they open their RSVP link.</span>
      </div>
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-ink">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to invitation
        </Link>
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">You're invited</p>
          <h1 className="font-display text-5xl mt-3 text-ink">{ev.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">Hello, {guestName}</p>
        </div>

        <Card className="p-7 space-y-3">
          <p className="text-muted-foreground">{ev.description}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" />{new Date(ev.starts_at).toLocaleString()}</span>
            <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" />{ev.location}</span>
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
          <Button className="bg-ink text-cream hover:bg-ink/90 w-full">Save RSVP</Button>
        </Card>

        {status === "yes" && (
          <Card className="p-7 space-y-5">
            <div>
              <h2 className="font-display text-2xl">Pre-order from your cultural choice restaurant</h2>
              <p className="text-sm text-muted-foreground mt-1">Pick what you'd like ready when you arrive.</p>
            </div>
            <Select value={restaurantId} onValueChange={(v) => { setRestaurantId(v); setCart({}); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} · {r.cuisine}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="divide-y divide-border">
              {restaurantMenu.map((m) => (
                <div key={m.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </div>
                  <span className="font-display text-lg w-16 text-right">${m.price.toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={() => setCart({ ...cart, [m.id]: Math.max(0, (cart[m.id] ?? 0) - 1) })}><Minus className="w-3 h-3" /></Button>
                    <span className="w-6 text-center">{cart[m.id] ?? 0}</span>
                    <Button size="icon" variant="outline" onClick={() => setCart({ ...cart, [m.id]: Math.min(10, (cart[m.id] ?? 0) + 1) })}><Plus className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Special requests" />
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl">Total: ${orderTotal.toFixed(2)}</span>
              <Button className="bg-terracotta text-cream hover:bg-terracotta/90">Place order</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
