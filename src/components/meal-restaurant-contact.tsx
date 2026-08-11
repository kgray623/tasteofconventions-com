import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Maximize2, Phone, Smartphone } from "lucide-react";
import { startZelleHandoff } from "@/lib/zelle-handoff";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  zelle_pay_link?: string | null;
  chicken_price?: number | string | null;
  beef_price?: number | string | null;
  price_note?: string | null;
};

export function useMealRestaurants() {
  return useQuery({
    queryKey: ["meal_restaurants_public"],
    staleTime: 60_000,
    queryFn: async (): Promise<RestaurantRow[]> => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "id,name,cuisine,phone,website,venmo_handle,zelle_name,zelle_phone,zelle_qr_url,zelle_pay_link,chicken_price,beef_price,price_note",
        )
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as RestaurantRow[];
    },
  });
}

const fmtMoney = (v: number | string | null | undefined) => {
  const n = typeof v === "string" ? Number(v) : v;
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  return Number.isInteger(n) ? `$${n}` : `$${(n as number).toFixed(2)}`;
};

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
  const [payOpen, setPayOpen] = useState(false);
  const restaurant = findRestaurantForCuisine(rows, cuisineKey);
  if (!restaurant) return null;
  const telHref = restaurant.phone ? `tel:${restaurant.phone.replace(/[^\d+]/g, "")}` : null;
  const chicken = fmtMoney(restaurant.chicken_price);
  const beef = fmtMoney(restaurant.beef_price);
  const hasZelle = !!(restaurant.zelle_phone || restaurant.zelle_name);
  const copyZellePhone = async () => {
    if (!restaurant.zelle_phone) return;
    try {
      await navigator.clipboard.writeText(restaurant.zelle_phone);
      toast.success("Zelle phone number copied.");
    } catch {
      toast.error("Could not copy the number. Press and hold the number to copy it.");
    }
  };

  const amountLine = [chicken ? `Chicken ${chicken}` : "", beef ? `Beef ${beef}` : ""]
    .filter(Boolean)
    .join(" · ");

  const handleZelleTap = async () => {
    const result = await startZelleHandoff({
      payLink: restaurant.zelle_pay_link,
      phone: restaurant.zelle_phone,
      name: restaurant.zelle_name,
    });
    setDiag(result);
    if (result.opened) return;
    if (result.copied) {
      toast.success(`${restaurant.zelle_phone} copied — paste it in Zelle.`);
    } else {
      toast.error(CLIPBOARD_EXPLANATIONS[result.clipboard]);
    }
    setPayOpen(true);
  };


  return (
    <div className="rounded-md border border-terracotta/40 bg-cream/50 p-3 space-y-1.5">
      <p className="font-display text-lg text-ink">{restaurant.name}</p>
      {hasZelle && (
        <div className="rounded-md bg-background/70 p-2.5 space-y-1.5">
          <p className="text-sm font-semibold text-ink">Pay by Zelle</p>
          {restaurant.zelle_qr_url && (
            <div className="rounded-md border border-terracotta/30 bg-white p-2 space-y-1.5">
              <p className="text-sm font-semibold text-ink">Zelle QR code</p>
              <button
                type="button"
                onClick={() => void handleZelleTap()}
                className="block w-full rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Pay ${restaurant.zelle_name ?? restaurant.name} with Zelle`}
              >
                <img
                  src={restaurant.zelle_qr_url}
                  alt={`Zelle QR code to pay ${restaurant.zelle_name ?? restaurant.name}`}
                  loading="lazy"
                  className="mx-auto h-56 w-56 max-w-full rounded border border-border bg-white object-contain p-1"
                />
              </button>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() => void handleZelleTap()}
                  className="w-full bg-terracotta text-primary-foreground hover:bg-terracotta/90"
                >
                  <Smartphone className="h-4 w-4" />
                  Pay with Zelle
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full">
                      <Maximize2 className="h-4 w-4" />
                      Enlarge QR
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[92vw] sm:max-w-md bg-white">
                    <DialogHeader>
                      <DialogTitle className="text-ink">
                        Zelle QR — {restaurant.zelle_name ?? restaurant.name}
                      </DialogTitle>
                    </DialogHeader>
                    <img
                      src={restaurant.zelle_qr_url}
                      alt={`Zelle QR code to pay ${restaurant.zelle_name ?? restaurant.name}`}
                      className="w-full rounded border border-border bg-white object-contain p-2"
                    />
                    {restaurant.zelle_phone && (
                      <p className="text-center text-sm text-ink">
                        Or look up {restaurant.zelle_phone}
                        {restaurant.zelle_name ? ` — ${restaurant.zelle_name}` : ""}
                      </p>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs text-muted-foreground">
                Tap the QR or &ldquo;Pay with Zelle&rdquo; on this device — we copy{" "}
                {restaurant.zelle_name ?? restaurant.name}&apos;s Zelle number for you, so you can
                paste it instead of searching. To pay from another device, enlarge this QR and scan
                it there.
              </p>
            </div>
          )}

          {/* Fallback sheet: shown when no payment app takes the hand-off. */}
          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <DialogContent className="max-w-[92vw] sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle className="text-ink">
                  Pay {restaurant.zelle_name ?? restaurant.name} by Zelle
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {amountLine && (
                  <p className="text-sm text-ink">
                    Send: <span className="font-semibold">{amountLine}</span>
                    {restaurant.price_note ? ` (${restaurant.price_note})` : ""}
                  </p>
                )}
                {restaurant.zelle_phone && (
                  <div className="rounded-md border border-terracotta/30 p-2.5 space-y-2">
                    <p className="text-sm text-ink">
                      Recipient:{" "}
                      <span className="font-semibold text-terracotta">
                        {restaurant.zelle_phone}
                      </span>
                      {restaurant.zelle_name ? ` — ${restaurant.zelle_name}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Already copied to your clipboard — open Zelle in your bank app, choose Send,
                      and paste this number.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => void copyZellePhone()}
                    >
                      <Copy className="h-4 w-4" />
                      Copy Zelle number again
                    </Button>
                  </div>
                )}
                {restaurant.zelle_pay_link && (
                  <Button
                    asChild
                    className="w-full bg-terracotta text-primary-foreground hover:bg-terracotta/90"
                  >
                    <a href={restaurant.zelle_pay_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open your bank app
                    </a>
                  </Button>
                )}
                {restaurant.zelle_qr_url && (
                  <img
                    src={restaurant.zelle_qr_url}
                    alt={`Zelle QR code to pay ${restaurant.zelle_name ?? restaurant.name}`}
                    className="w-full rounded border border-border bg-white object-contain p-2"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Put your name in the Zelle memo so the restaurant can match your payment.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          {restaurant.zelle_phone && (
            <div className="flex items-center justify-between gap-2 text-sm text-ink">
              <p className="min-w-0">
                Zelle: look up{" "}
                <span className="font-semibold text-terracotta">{restaurant.zelle_phone}</span>
                {restaurant.zelle_name ? ` — ${restaurant.zelle_name}` : ""}
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => void copyZellePhone()}
                aria-label={`Copy Zelle phone number for ${restaurant.zelle_name ?? restaurant.name}`}
                title="Copy Zelle phone number"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          {!restaurant.zelle_phone && restaurant.zelle_name && (
            <p className="text-sm text-ink">Zelle: {restaurant.zelle_name}</p>
          )}
          {amountLine && (
            <p className="text-sm text-ink">
              Send the amount for your choice:{" "}
              <span className="font-semibold">{amountLine}</span>
              {restaurant.price_note ? ` (${restaurant.price_note})` : ""}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Put your name in the Zelle memo so the restaurant can match your payment.
          </p>
          {restaurant.venmo_handle && (
            <p className="text-sm text-ink">
              Venmo also works:{" "}
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
        </div>
      )}


      <p className="text-sm text-ink">
        {hasZelle ? "Or call to pay by phone:" : "Call to pay for this meal directly:"}{" "}
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
