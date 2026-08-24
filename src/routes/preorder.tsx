import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { useMealRestaurants } from "@/components/meal-restaurant-contact";
import { MealWaitingListRequest } from "@/components/meal-waiting-list-request";

export const Route = createFileRoute("/preorder")({
  head: () => ({
    meta: [
      { title: "Catered meal requests · A Taste of Special Conventions" },
      { name: "description", content: "Meal preordering is closed. You can still pay a restaurant directly and ask to be added to the catered meal waiting list for August 30, 2026." },
      { property: "og:title", content: "Catered meal requests · A Taste of Special Conventions" },
      { property: "og:description", content: "Meal preordering is closed — pay now to join the catered meal waiting list for the August 30, 2026 evening at Eagle's Landing." },
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

  const cuisineLabel = (country: string): string => {
    const c = country.toLowerCase();
    if (c.includes("myanmar")) return "Burmese — Myanmar";
    if (c.includes("mozambique") || c.includes("zimbabwe")) return "African — Mozambique & Zimbabwe";
    if (c.includes("indonesia")) return "Indonesian — Indonesia";
    return country;
  };

  const { data: restaurants } = useMealRestaurants();


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

