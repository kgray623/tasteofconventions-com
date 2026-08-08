import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  MealPriceNote,
  MealRestaurantContact,
  useMealRestaurants,
} from "@/components/meal-restaurant-contact";
import { mealPhotoSetBySlug } from "@/lib/meal-photos";

export const Route = createFileRoute("/meals/$cuisine")({
  head: ({ params }) => {
    const set = mealPhotoSetBySlug(params.cuisine);
    const label = set?.label ?? "Cultural meal";
    const title = `${label} meal photos — A Taste of Special Conventions`;
    const description = `Photos of the ${label} catered meal, plus the restaurant's phone number and how to pay for your order.`;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (!set) meta.push({ name: "robots", content: "noindex" });
    return { meta };
  },
  component: MealPhotosPage,
  notFoundComponent: MissingCuisine,
});

function MissingCuisine() {
  return (
    <div className="mx-auto max-w-2xl p-6 text-center space-y-3">
      <h1 className="font-display text-2xl">We couldn't find that meal</h1>
      <p className="text-sm text-muted-foreground">
        Check the link, or open your RSVP to see your meal.
      </p>
      <Link to="/my-rsvp" className="text-terracotta underline underline-offset-4">
        Go to my RSVP
      </Link>
    </div>
  );
}

function MealPhotosPage() {
  const { cuisine } = Route.useParams();
  const set = mealPhotoSetBySlug(cuisine);
  const { data: rows } = useMealRestaurants();
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!set) return <MissingCuisine />;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          A Taste of Special Conventions
        </p>
        <h1 className="font-display text-3xl text-ink">{set.label} meal</h1>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {set.photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setLightbox(src)}
            className="overflow-hidden rounded-md border border-border"
          >
            <img
              src={src}
              alt={`${set.label} catered meal photo ${i + 1}`}
              loading="lazy"
              className="h-28 w-full object-cover sm:h-32"
            />
          </button>
        ))}
      </div>

      <Card className="p-4 space-y-3">
        <MealPriceNote />
        <MealRestaurantContact cuisineKey={set.cuisine} rows={rows} />
      </Card>

      <p className="text-xs text-muted-foreground">
        Tap a photo to see it larger. Save your receipt or confirmation to show at the event.
      </p>

      <Dialog open={lightbox !== null} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">{set.label} meal photo</DialogTitle>
          {lightbox && (
            <img src={lightbox} alt={`${set.label} catered meal`} className="h-auto w-full rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
