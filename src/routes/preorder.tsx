import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/preorder")({
  head: () => ({
    meta: [
      { title: "Pre-order cuisine · A Taste of Special Conventions" },
      { name: "description", content: "Tell us how many meals you'd like from each cultural cuisine so we can plan with the restaurants for August 30, 2026." },
      { property: "og:title", content: "Pre-order cuisine · A Taste of Special Conventions" },
      { property: "og:description", content: "Reserve meals from each cultural cuisine for the August 30, 2026 evening at Eagle's Landing." },
    ],
  }),
  component: PreorderPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="text-destructive mb-4">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Not found</div>,
});

type Stop = { country: string; when?: string; note?: string; restaurant?: string | null };

function PreorderPage() {
  const { data: content } = useQuery({
    queryKey: ["invitation_content_preorder"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_content")
        .select("itinerary")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const cuisines = useMemo<Stop[]>(() => {
    const list = (content?.itinerary as Stop[] | null) ?? [];
    return list.filter((s) => s.restaurant);
  }, [content]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const setCount = (country: string, value: number) => {
    setCounts((c) => ({ ...c, [country]: Math.max(0, Math.min(50, value || 0)) }));
  };

  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Please add your name and phone number.");
      return;
    }
    if (total === 0) {
      toast.error("Add at least one meal to pre-order.");
      return;
    }
    setSubmitting(true);
    const selections = Object.entries(counts)
      .filter(([, qty]) => qty > 0)
      .map(([country, qty]) => ({ country, qty }));
    const { error } = await supabase
      .from("cuisine_preorders")
      .insert({ name: name.trim().slice(0, 120), phone: phone.trim().slice(0, 40), selections });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks! We'll be in touch with the menu soon.");
    setName("");
    setPhone("");
    setCounts({});
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to the invitation
        </Link>

        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-magenta mb-3 inline-flex items-center gap-2 justify-center">
            <UtensilsCrossed className="w-4 h-4" /> Pre-order interest
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-ink">Cuisine pre-order</h1>
          <p className="mt-4 text-muted-foreground">
            Catered meals will be in the $25.00 range per meal. Tell us how many of each
            cuisine you'd like and we'll send the menu to confirm in the coming weeks.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-border bg-card shadow-elegant p-6 sm:p-8 space-y-6"
        >
          <section className="space-y-4">
            <h2 className="font-display text-xl text-ink">Your contact details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                required
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-ink">How many meals of each cuisine?</h2>
            {cuisines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cuisines will appear here once the itinerary is set.</p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border">
                {cuisines.map((stop) => {
                  const qty = counts[stop.country] ?? 0;
                  const qtyId = `qty-${stop.country.replace(/\s+/g, "-").toLowerCase()}`;
                  return (
                    <div key={stop.country} className="flex items-center justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <Label htmlFor={qtyId} className="font-display text-lg text-ink truncate block">{stop.country}</Label>
                        {stop.restaurant ? (
                          <p className="text-xs text-muted-foreground truncate">{stop.restaurant}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setCount(stop.country, qty - 1)}
                          aria-label={`Decrease ${stop.country}`}
                        >
                          −
                        </Button>
                        <Input
                          id={qtyId}
                          aria-label={`${stop.country} quantity`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={50}
                          value={qty}
                          onChange={(e) => setCount(stop.country, parseInt(e.target.value, 10))}
                          className="w-16 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setCount(stop.country, qty + 1)}
                          aria-label={`Increase ${stop.country}`}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total meals: <span className="font-semibold text-ink">{total}</span></p>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-sunset text-white hover:opacity-90 border-0 shadow-glow"
            >
              {submitting ? "Submitting…" : "Submit pre-order"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
