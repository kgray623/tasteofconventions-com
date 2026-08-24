import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { submitStandaloneCuisinePreorder } from "@/lib/invitations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { MEAL_INTRO_COPY } from "@/lib/meal-pricing";
import { MealPriceNote, MealRestaurantContact, useMealRestaurants } from "@/components/meal-restaurant-contact";

export const Route = createFileRoute("/preorder")({
  head: () => ({
    meta: [
      { title: "Order your catered meal · A Taste of Special Conventions" },
      { name: "description", content: "Tell us how many meals you'd like from each cultural cuisine so we can plan with the restaurants for August 30, 2026." },
      { property: "og:title", content: "Order your catered meal · A Taste of Special Conventions" },
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
  const savePreorder = useServerFn(submitStandaloneCuisinePreorder);
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

  const cuisineLabel = (country: string): string => {
    const c = country.toLowerCase();
    if (c.includes("myanmar")) return "Burmese — Myanmar";
    if (c.includes("mozambique") || c.includes("zimbabwe")) return "African — Mozambique & Zimbabwe";
    if (c.includes("indonesia")) return "Indonesian — Indonesia";
    return country;
  };

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { data: restaurants } = useMealRestaurants();
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
      toast.error("Add at least one meal to order.");
      return;
    }
    setSubmitting(true);
    const selections = Object.entries(counts)
      .filter(([, qty]) => qty > 0)
      .map(([country, qty]) => ({ cuisine: country, qty }));
    try {
      await savePreorder({
        data: {
          name: name.trim().slice(0, 120),
          phone: phone.trim().slice(0, 40),
          selections,
        },
      });
    } catch (error) {
      setSubmitting(false);
      toast.error(error instanceof Error ? error.message : "Could not save meal choices");
      return;
    }
    setSubmitting(false);
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
            <UtensilsCrossed className="w-4 h-4" /> Catered meals
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-ink">Catered meal requests</h1>
        </div>

        <MealWaitingListRequest
          cuisines={cuisines.map((stop) => ({
            key: stop.country,
            label: cuisineLabel(stop.country),
          }))}
          restaurants={restaurants}
        />
      </main>
    </div>
  );
}

