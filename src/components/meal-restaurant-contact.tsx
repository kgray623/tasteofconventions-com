import { useQuery } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCuisine } from "@/lib/preorder-math";
import { MEAL_PAY_DEADLINE_LINE, MEAL_PRICE_DISCLAIMER, MEAL_PRICE_LINE } from "@/lib/meal-pricing";

type RestaurantRow = {
  id: string;
  name: string;
  cuisine: string | null;
  phone: string | null;
  website: string | null;
  venmo_handle?: string | null;
  zelle_name?: string | null;
  zelle_phone?: string | null;
  zelle_qr_url?: string | null;
};

export function useMealRestaurants() {
  return useQuery({
    queryKey: ["meal_restaurants_public"],
    staleTime: 60_000,
    queryFn: async (): Promise<RestaurantRow[]> => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id,name,cuisine,phone,website,venmo_handle,zelle_name,zelle_phone,zelle_qr_url")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as RestaurantRow[];
    },
  });
}

export function findRestaurantForCuisine(
  rows: RestaurantRow[] | undefined,
  cuisineKey: string,
): RestaurantRow | undefined {
  const target = normalizeCuisine(cuisineKey);
  return (rows ?? []).find(
    (r) => normalizeCuisine(r.cuisine ?? r.name) === target,
  );
}

/** Price line + payment deadline. Always safe to show, even without a match. */
export function MealPriceNote({ className = "" }: { className?: string }) {
  return (
    <div className={`text-sm ${className}`}>
      <p className="font-medium text-ink">{MEAL_PRICE_LINE}</p>
      <p className="text-xs text-muted-foreground">{MEAL_PRICE_DISCLAIMER}</p>
    </div>
  );
}

/**
 * Restaurant name, tappable phone number and website for one cuisine, plus the
 * "call to pay directly" instruction and the payment deadline.
 */
export function MealRestaurantContact({
  cuisineKey,
  rows,
  paid = false,
}: {
  cuisineKey: string;
  rows: RestaurantRow[] | undefined;
  paid?: boolean;
}) {
  const restaurant = findRestaurantForCuisine(rows, cuisineKey);
  if (!restaurant) return null;
  const telHref = restaurant.phone ? `tel:${restaurant.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className="rounded-md border border-terracotta/40 bg-cream/50 p-3 space-y-1.5">
      <p className="font-display text-lg text-ink">{restaurant.name}</p>
      <p className="text-sm text-ink">
        Call to pay for this meal directly:{" "}
        {telHref ? (
          <a
            href={telHref}
            className="inline-flex items-center gap-1 font-semibold text-terracotta underline underline-offset-4"
          >
            <Phone className="h-3.5 w-3.5" />
            {restaurant.phone}
          </a>
        ) : (
          <span className="text-muted-foreground">phone number coming soon</span>
        )}
      </p>
      {(restaurant.venmo_handle || restaurant.zelle_phone) && (
        <div className="rounded-md bg-background/70 p-2.5 space-y-1.5">
          <p className="text-sm font-semibold text-ink">Or pay online</p>
          {restaurant.venmo_handle && (
            <p className="text-sm text-ink">
              Venmo:{" "}
              <a
                href={`https://venmo.com/u/${restaurant.venmo_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-terracotta underline underline-offset-4"
              >
                @{restaurant.venmo_handle}
              </a>
            </p>
          )}
          {restaurant.zelle_phone && (
            <p className="text-sm text-ink">
              Zelle: look up{" "}
              <a
                href={`tel:${restaurant.zelle_phone.replace(/[^\d+]/g, "")}`}
                className="font-semibold text-terracotta underline underline-offset-4"
              >
                {restaurant.zelle_phone}
              </a>
              {restaurant.zelle_name ? ` — ${restaurant.zelle_name}` : ""}
            </p>
          )}
          {restaurant.zelle_qr_url && (
            <a href={restaurant.zelle_qr_url} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={restaurant.zelle_qr_url}
                alt={`Zelle QR code to pay ${restaurant.zelle_name ?? restaurant.name}`}
                loading="lazy"
                className="h-32 w-32 rounded border border-border bg-white object-contain p-1"
              />
              <span className="text-xs text-muted-foreground">Tap to enlarge, then scan in your banking app</span>
            </a>
          )}
        </div>
      )}
      {restaurant.website && (
        <p className="text-sm">
          <a
            href={restaurant.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-terracotta underline underline-offset-4"
          >
            Visit website
          </a>
        </p>
      )}
      {!paid && <p className="text-xs text-muted-foreground">{MEAL_PAY_DEADLINE_LINE}</p>}
    </div>
  );
}
