import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";
import { MealPriceNote, MealRestaurantContact } from "@/components/meal-restaurant-contact";
import { requestMealWaitingList } from "@/lib/meal-waiting-list.functions";
import { getErrorMessage } from "@/lib/async-safety";

export const MEAL_PREORDER_CLOSED_NOTICE =
  "Meal preordering is now closed — we've locked in our numbers with the restaurants. If you'd still like to request a plate, you can pay now to be added to the waiting list, and we'll confirm with the restaurant.";

const METHODS = [
  { key: "zelle", label: "Zelle" },
  { key: "venmo", label: "Venmo" },
  { key: "cash", label: "Cash" },
  { key: "card", label: "Card" },
  { key: "other", label: "Other" },
] as const;

type Cuisine = { key: string; label: string; photos?: string[]; note?: string };

type Props = {
  token?: string;
  defaultName?: string;
  defaultPhone?: string;
  cuisines: Cuisine[];
  restaurants: Parameters<typeof MealRestaurantContact>[0]["rows"];
  onPhotoClick?: (src: string) => void;
};

/**
 * Preordering is closed. This replaces the cuisine/quantity preorder selector on
 * every guest surface: the guest picks a cuisine, pays the restaurant directly
 * using that restaurant's own payment details, and reports the payment. Only
 * then is a waiting-list request submitted.
 */
export function MealWaitingListRequest({
  token,
  defaultName = "",
  defaultPhone = "",
  cuisines,
  restaurants,
  onPhotoClick,
}: Props) {
  const submitRequest = useServerFn(requestMealWaitingList);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ cuisine: string; qty: number }[]>([]);

  const submit = async (cuisine: string) => {
    const count = qty[cuisine] ?? 1;
    const chosen = method[cuisine];
    if (!name.trim() || !phone.trim()) {
      toast.error("Please add your name and mobile number.");
      return;
    }
    if (!chosen) {
      toast.error("Choose how you paid the restaurant — payment is required to join the waiting list.");
      return;
    }
    setBusy(cuisine);
    try {
      await submitRequest({
        data: {
          ...(token ? { token } : {}),
          name: name.trim(),
          phone: phone.trim(),
          cuisine,
          qty: count,
          payment_method: chosen as "zelle",
          ...(note[cuisine]?.trim() ? { payment_note: note[cuisine]!.trim() } : {}),
        },
      });
      setSubmitted((cur) => [...cur, { cuisine, qty: count }]);
      setOpenFor(null);
      toast.success("Payment reported — you're on the waiting list. We'll confirm with the restaurant.");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Could not save your request."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-7 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-magenta inline-flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4" /> Catered meals
        </p>
        <h2 className="font-display text-2xl text-ink mt-2">Meal preordering is closed</h2>
        <p className="text-sm text-muted-foreground mt-1">{MEAL_PREORDER_CLOSED_NOTICE}</p>
      </div>

      {submitted.length > 0 && (
        <div className="rounded-lg border-2 border-emerald-600 bg-emerald-600/10 p-3 text-sm text-ink">
          <p className="font-medium">Waiting-list request received</p>
          <ul className="mt-1 space-y-0.5">
            {submitted.map((s) => (
              <li key={`${s.cuisine}-${s.qty}`}>
                {s.qty}× {s.cuisine} — payment reported, awaiting restaurant confirmation
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wl-name">Your name</Label>
          <Input id="wl-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wl-phone">Mobile number</Label>
          <Input
            id="wl-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
          />
        </div>
      </div>

      <div className="space-y-3">
        {cuisines.map((cuisine) => {
          const count = qty[cuisine.key] ?? 1;
          const open = openFor === cuisine.key;
          return (
            <div key={cuisine.key} className="rounded-md border border-border bg-card p-4 space-y-3">
              <h3 className="font-display text-2xl text-ink font-bold">{cuisine.label}</h3>
              <MealPriceNote cuisineKey={cuisine.key} rows={restaurants} />
              {cuisine.photos && cuisine.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {cuisine.photos.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => onPhotoClick?.(src)}
                      className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
                      aria-label={`${cuisine.label} meal photo ${i + 1}`}
                    >
                      <img
                        src={src}
                        alt={`${cuisine.label} cultural meal — example dish ${i + 1}`}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
              {cuisine.note && <p className="text-sm italic text-muted-foreground">{cuisine.note}</p>}

              <MealRestaurantContact cuisineKey={cuisine.key} rows={restaurants} />

              {!open ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenFor(cuisine.key)}
                >
                  Request {cuisine.label} — I'll pay now
                </Button>
              ) : (
                <div className="space-y-3 rounded-md border border-terracotta/40 bg-terracotta/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">How many plates?</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setQty({ ...qty, [cuisine.key]: Math.max(1, count - 1) })}
                        aria-label={`Fewer ${cuisine.label} plates`}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-10 text-center font-display text-2xl text-ink">{count}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setQty({ ...qty, [cuisine.key]: Math.min(20, count + 1) })}
                        aria-label={`More ${cuisine.label} plates`}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">
                      How did you pay the restaurant? <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {METHODS.map((m) => (
                        <Button
                          key={m.key}
                          type="button"
                          size="sm"
                          variant={method[cuisine.key] === m.key ? "default" : "outline"}
                          onClick={() => setMethod({ ...method, [cuisine.key]: m.key })}
                        >
                          {m.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`wl-note-${cuisine.key}`} className="text-sm">
                      Confirmation note (name on the payment, date, confirmation number)
                    </Label>
                    <Textarea
                      id={`wl-note-${cuisine.key}`}
                      value={note[cuisine.key] ?? ""}
                      onChange={(e) => setNote({ ...note, [cuisine.key]: e.target.value })}
                      maxLength={500}
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => submit(cuisine.key)}
                      disabled={busy !== null}
                      className="bg-terracotta text-cream hover:bg-terracotta/90"
                    >
                      {busy === cuisine.key ? "Saving…" : "I've paid — add me to the waiting list"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setOpenFor(null)}>
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your request is only submitted once you report your payment.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
