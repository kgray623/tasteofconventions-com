import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/restaurants")({
  head: () => ({
    meta: [
      { title: "Restaurants — A Taste of Special Conventions" },
      { name: "description", content: "Browse the curated restaurant lineup for the event." },
    ],
  }),
  component: Restaurants,
});

type R = { id: string; name: string; description: string | null; cuisine: string | null; image_url: string | null };
type M = { id: string; restaurant_id: string; name: string; description: string | null; price: number; category: string | null; dietary_flags: string[] | null };

function Restaurants() {
  const [restaurants, setRestaurants] = useState<R[]>([]);
  const [items, setItems] = useState<M[]>([]);

  useEffect(() => {
    supabase.from("restaurants").select("*").eq("active", true).order("name").then(({ data }) => setRestaurants(data ?? []));
    supabase.from("menu_items").select("*").eq("available", true).then(({ data }) => setItems((data as M[]) ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Curated lineup</p>
        <h1 className="font-display text-5xl mt-2">Restaurants</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Hand-picked kitchens contributing to the evening. Guests order directly from their RSVP page.
        </p>

        <div className="mt-10 space-y-8">
          {restaurants.map((r) => {
            const menu = items.filter((m) => m.restaurant_id === r.id);
            return (
              <Card key={r.id} className="p-7">
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-display text-3xl">{r.name}</h2>
                    {r.cuisine && <p className="text-sm text-muted-foreground mt-1">{r.cuisine}</p>}
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground max-w-md text-right">{r.description}</p>}
                </div>
                {menu.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Menu coming soon.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {menu.map((m) => (
                      <div key={m.id} className="flex justify-between gap-4 py-2 border-t border-border first:border-t-0">
                        <div>
                          <p className="font-medium">{m.name}</p>
                          {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                          {m.dietary_flags && m.dietary_flags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {m.dietary_flags.map((f) => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
                            </div>
                          )}
                        </div>
                        <span className="font-display text-lg shrink-0">${Number(m.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
