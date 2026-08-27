import { Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyInvitation, submitCuisinePreorder } from "@/lib/invitations.functions";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Check, X, UtensilsCrossed, Minus, Plus } from "lucide-react";
import { SharedPhotoAlbum } from "@/components/shared-photo-album";

import { withTimeout } from "@/lib/async-safety";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MEAL_INTRO_COPY } from "@/lib/meal-pricing";
import {
  MealPriceNote,
  MealRestaurantContact,
  findRestaurantForCuisine,
  useMealRestaurants,
} from "@/components/meal-restaurant-contact";
import { GuestMealPaymentReport } from "@/components/guest-meal-payment-report";
import { MealWaitingListRequest } from "@/components/meal-waiting-list-request";

import africanMeal1 from "@/assets/african-meal-1.jpg.asset.json";
import africanMeal2 from "@/assets/african-meal-2.jpg.asset.json";
import africanMeal3 from "@/assets/african-meal-3.jpg.asset.json";
import indonesianMeal1 from "@/assets/indonesian-meal-1.jpg.asset.json";
import indonesianMeal2 from "@/assets/indonesian-meal-2.jpg.asset.json";
import indonesianMeal3 from "@/assets/indonesian-meal-3.jpg.asset.json";
import myanmarMeal1 from "@/assets/myanmar-meal-1.jpg.asset.json";
import myanmarMeal2 from "@/assets/myanmar-meal-2.jpg.asset.json";
import myanmarMeal3 from "@/assets/myanmar-meal-3.jpg.asset.json";
import myanmarMeal4 from "@/assets/myanmar-meal-4.jpg.asset.json";
import { formatEventDateRange } from "@/lib/event-time";

const africanPhotos = [africanMeal1.url, africanMeal2.url, africanMeal3.url];
const indonesianPhotos = [indonesianMeal1.url, indonesianMeal2.url, indonesianMeal3.url];
const myanmarPhotos = [myanmarMeal1.url, myanmarMeal2.url, myanmarMeal3.url, myanmarMeal4.url];


type CuisineSelection = { cuisine: string; qty: number };
type MyRsvpData = {
  invitation: {
    rsvp_token: string;
    guest_name: string;
    guest_phone?: string | null;
    events: { title: string; starts_at: string; ends_at?: string | null; location?: string | null };
  };
  rsvp?: {
    responded_at?: string | null;
    status?: string;
    attendance_mode?: string | null;
    party_size?: number | null;
    ordering_food?: boolean | null;
    invited_by?: string | null;
  } | null;
  order?: { items?: unknown; total?: number | string | null; notes?: string | null } | null;
  preorder?: { selections?: unknown; updated_at?: string | null } | null;
  mealPayments?: Array<{
    cuisine: string;
    /** Plates ordered of this cuisine, so partial payments can be shown honestly. */
    qty?: number | null;
    qty_paid: number;
    paid_at: string | null;
    source?: string | null;
    method?: string | null;
    state?: "paid_confirmed" | "paid_reported";
    confirmed_at?: string | null;
  }> | null;
  mealStatuses?: Array<{ cuisine: string; confirmed: boolean; confirmed_at: string | null }> | null;
};

function isCuisineSelection(value: unknown): value is CuisineSelection {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "cuisine" in value &&
      "qty" in value &&
      typeof (value as CuisineSelection).cuisine === "string" &&
      typeof (value as CuisineSelection).qty === "number",
  );
}

/**
 * Inner contents of the My RSVP page. Renders without any full-screen wrapper
 * so it can be embedded inside another layout (e.g. the committee workspace).
 */
export function MyRsvpContent() {
  const { user, loading } = useAuth();
  const fetchMine = useServerFn(getMyInvitation);
  const saveCuisinePreorder = useServerFn(submitCuisinePreorder);
  const [state, setState] = useState<"loading" | "none" | "ready">("loading");
  const [data, setData] = useState<MyRsvpData | null>(null);
  const [cuisineCounts, setCuisineCounts] = useState<Record<string, number>>({});
  const [savingMeals, setSavingMeals] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const { data: restaurants } = useMealRestaurants();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    let cancelled = false;
    const fallback = window.setTimeout(() => {
      if (!cancelled) setState("none");
    }, 10000);
    (async () => {
      try {
        const r = (await withTimeout(fetchMine(), 10000)) as MyRsvpData;
        if (cancelled) return;
        if (r?.invitation) {
          setData(r);
          const selections: unknown = r.preorder?.selections;
          const restoredCounts = Array.isArray(selections)
            ? selections.filter(isCuisineSelection).reduce(
                (acc: Record<string, number>, item) => {
                  if (item.qty > 0) acc[item.cuisine] = item.qty;
                  return acc;
                },
                {},
              )
            : {};
          setCuisineCounts(restoredCounts);
          setState("ready");
        } else {
          setState("none");
        }
      } catch {
        setState("none");
      } finally {
        window.clearTimeout(fallback);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [user, loading, fetchMine]);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (state === "loading") {
    return (
      <div className="py-10 text-center text-muted-foreground">Loading your RSVP…</div>
    );
  }

  if (state === "ready" && data?.invitation) {
    const invitation = data.invitation;
    const ev = invitation.events;
    const rsvp = data.rsvp;
    const order = data.order;
    const rsvpDone = !!rsvp?.responded_at;
    const rsvpYes = rsvp?.status === "yes";
    const rsvpAttending = rsvp?.status !== "no";
    const orderItems: Array<{ name?: string; quantity?: number; price?: number }> = Array.isArray(
      order?.items,
    )
      ? order.items
      : [];
    const cuisines: { key: string; label: string; photos?: string[]; note?: string }[] = [
      { key: "Myanmar", label: "Myanmar/Burmese", photos: myanmarPhotos },
      { key: "African", label: "African", photos: africanPhotos },
      { key: "Indonesian", label: "Indonesian", photos: indonesianPhotos },
    ];
    const preorderTotal = Object.values(cuisineCounts).reduce(
      (sum, qty) => sum + (Number(qty) || 0),
      0,
    );
    const menuOrderDone = orderItems.length > 0;
    const orderDone = menuOrderDone || preorderTotal > 0;
    // Saved meals (not the in-progress editor state) that have no payment on record.
    const savedSelections = Array.isArray(data.preorder?.selections)
      ? (data.preorder!.selections as unknown[]).filter(isCuisineSelection)
      : [];
    // Plates still owed: ordered quantity minus whatever is already on record.
    // A partially paid cuisine stays here so the guest can report the rest.
    const unpaidOrderedCuisines = savedSelections
      .map((s) => {
        const cuisine = String(s.cuisine);
        const qty = Number(s.qty) || 0;
        const paid = (data.mealPayments ?? [])
          .filter((p) => p.cuisine === cuisine)
          .reduce((sum, p) => sum + (Number(p.qty_paid) || 0), 0);
        return { cuisine, qty: Math.max(0, qty - paid) };
      })
      .filter((s) => s.qty > 0);
    const setCuisineQty = (cuisine: string, qty: number) => {
      setCuisineCounts((current) => ({
        ...current,
        [cuisine]: Math.max(0, Math.min(20, qty || 0)),
      }));
    };
    const saveMeals = async () => {
      const savedMap = new Map(
        savedSelections.map((s) => [String(s.cuisine), Number(s.qty) || 0]),
      );
      const submitted = cuisines.map((c) => ({
        cuisine: c.key,
        qty: Math.max(0, Number(cuisineCounts[c.key] ?? savedMap.get(c.key) ?? 0) || 0),
      }));
      const reductions = submitted.filter((s) => s.qty < (savedMap.get(s.cuisine) ?? 0));
      if (reductions.length > 0) {
        const detail = reductions
          .map((r) => `${r.cuisine}: ${savedMap.get(r.cuisine) ?? 0} → ${r.qty}`)
          .join(", ");
        const ok = window.confirm(
          `Remove or lower these meals? ${detail}\n\nNothing else changes, and this is recorded.`,
        );
        if (!ok) return;
      }
      setSavingMeals(true);
      try {
        const result = (await saveCuisinePreorder({
          data: {
            token: invitation.rsvp_token,
            selections: submitted,
            confirmed_removals: reductions.map((r) => r.cuisine),
          },
        })) as { selections?: Array<{ cuisine: string; qty: number }> };
        const selections = result?.selections ?? submitted.filter((s) => s.qty > 0);
        setData((current) => (current ? { ...current, preorder: { selections } } : current));
        setCuisineCounts(
          selections.reduce((acc: Record<string, number>, s) => {
            acc[s.cuisine] = s.qty;
            return acc;
          }, {}),
        );
        toast.success(selections.length === 0 ? "Meal order cancelled." : "Meal order saved.");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Could not save meal order");
      } finally {
        setSavingMeals(false);
      }
    };


    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <SharedPhotoAlbum guestName={invitation.guest_name} />
        
        
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">My RSVP</p>
          <h1 className="font-display text-4xl sm:text-5xl mt-3 text-ink">
            Hello, {invitation.guest_name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your invitation details are loaded from your account.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className={`rounded-lg border-2 p-5 flex items-center gap-4 ${rsvpDone ? (rsvpYes ? "border-ink bg-ink text-cream" : "border-ink bg-cream text-ink") : "border-dashed border-border bg-card text-muted-foreground"}`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${rsvpDone ? (rsvpYes ? "bg-cream text-ink" : "bg-ink text-cream") : "bg-muted text-muted-foreground"}`}
            >
              {rsvpDone ? (
                rsvpYes ? (
                  <Check className="w-6 h-6" strokeWidth={3} />
                ) : (
                  <X className="w-6 h-6" strokeWidth={3} />
                )
              ) : (
                <span className="font-display text-xl">?</span>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-80">RSVP</p>
              <p className="font-display text-2xl leading-tight">
                {rsvpDone ? (rsvpYes ? "RSVP'd" : "Declined") : "Not yet"}
              </p>
              {rsvpDone && rsvpYes && (
                <p className="text-xs opacity-90 mt-0.5">
                  {rsvp?.attendance_mode === "zoom"
                    ? "Virtual (Zoom)"
                    : `In person · party of ${rsvp?.party_size ?? 1}`}
                </p>
              )}
            </div>
          </div>

          <div
            className={`rounded-lg border-2 p-5 flex items-center gap-4 ${orderDone ? "border-terracotta bg-terracotta text-cream" : "border-dashed border-border bg-card text-muted-foreground"}`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${orderDone ? "bg-cream text-terracotta" : "bg-muted text-muted-foreground"}`}
            >
              <UtensilsCrossed className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-80">Meal order</p>
              <p className="font-display text-2xl leading-tight">
                {orderDone ? "ORDERED" : "No order yet"}
              </p>
              {menuOrderDone ? (
                <p className="text-xs opacity-90 mt-0.5">
                  {orderItems.reduce((s, i) => s + (i.quantity ?? 0), 0)} item
                  {orderItems.length === 1 ? "" : "s"} · ${Number(order?.total ?? 0).toFixed(2)}
                </p>
              ) : preorderTotal > 0 ? (
                <p className="text-xs opacity-90 mt-0.5">
                  {preorderTotal} restaurant meal{preorderTotal === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {menuOrderDone && (
          <Card className="p-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">What you ordered</h2>
              <span className="font-display text-xl text-terracotta">
                ${Number(order?.total ?? 0).toFixed(2)}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {orderItems.map((it, idx) => (
                <li key={idx} className="py-2 flex items-center gap-3 text-sm">
                  <span className="font-display text-lg w-8 text-terracotta">
                    {it.quantity ?? 1}×
                  </span>
                  <span className="flex-1 text-ink">{it.name ?? "Item"}</span>
                  <span className="text-muted-foreground">
                    ${(Number(it.price ?? 0) * Number(it.quantity ?? 1)).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            {order?.notes && (
              <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                Note: {order.notes}
              </p>
            )}
          </Card>
        )}

        {(data.mealStatuses ?? []).some((s) => s.confirmed) && (
          <Card className="p-7 space-y-3 border-2 border-terracotta">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-terracotta text-white text-lg">
                ✓
              </span>
              <h2 className="font-display text-2xl">Order confirmed by the restaurant</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              The restaurant has accepted your meal order for the event.
            </p>
            <ul className="divide-y divide-border">
              {(data.mealStatuses ?? [])
                .filter((s) => s.confirmed)
                .map((s) => (
                  <li key={s.cuisine} className="py-2 flex items-center gap-3 text-sm">
                    <span className="flex-1 text-ink">{s.cuisine}</span>
                    <span className="text-terracotta font-medium">
                      Confirmed
                      {s.confirmed_at ? ` · ${new Date(s.confirmed_at).toLocaleDateString()}` : ""}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        )}

        {(data.mealPayments ?? []).some((p) => Number(p.qty_paid) > 0) && (
          <Card className="p-7 space-y-3 border-2 border-emerald-600">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white text-lg">
                ✓
              </span>
              <h2 className="font-display text-2xl">Meal payment on record</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Show this screen (or your own receipt) at the event to pick up your meal. Payments
              you reported yourself stay on record while the restaurant matches them up.
            </p>
            <ul className="divide-y divide-border">
              {(data.mealPayments ?? [])
                .filter((p) => Number(p.qty_paid) > 0)
                .map((p) => {
                  const confirmed = p.state === "paid_confirmed" || (p.source ?? "restaurant") === "restaurant";
                  const ordered = Number(p.qty) || 0;
                  const paid = Number(p.qty_paid) || 0;
                  const stillDue = ordered > paid ? ordered - paid : 0;
                  return (
                    <li key={p.cuisine} className="py-2 flex items-center gap-3 text-sm">
                      <span className="font-display text-lg w-12 text-emerald-700">
                        {stillDue > 0 ? `${paid}/${ordered}` : `${paid}×`}
                      </span>
                      <span className="flex-1 text-ink">
                        {p.cuisine}
                        {confirmed && findRestaurantForCuisine(restaurants, p.cuisine)
                          ? ` — confirmed by ${findRestaurantForCuisine(restaurants, p.cuisine)!.name}`
                          : ""}
                        {!confirmed ? " — you reported this payment" : ""}
                        {stillDue > 0 ? (
                          <span className="block text-terracotta font-medium">
                            {stillDue} plate{stillDue === 1 ? "" : "s"} still to pay — report it below
                            once you have paid the restaurant.
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={
                          stillDue > 0
                            ? "text-terracotta font-medium"
                            : confirmed
                              ? "text-emerald-700 font-medium"
                              : "text-terracotta font-medium"
                        }
                      >
                        {stillDue > 0
                          ? `Partly paid · ${paid} of ${ordered}`
                          : confirmed
                            ? "Paid"
                            : "Awaiting restaurant confirmation"}
                        {(confirmed ? p.confirmed_at || p.paid_at : p.paid_at) ? ` · ${new Date((confirmed ? p.confirmed_at || p.paid_at : p.paid_at) as string).toLocaleDateString()}` : ""}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </Card>
        )}

        {unpaidOrderedCuisines.length > 0 && (
          <GuestMealPaymentReport
            token={invitation.rsvp_token}
            unpaid={unpaidOrderedCuisines}
            onReported={(cuisine, qty, method) =>
              setData((current) =>
                current
                  ? {
                      ...current,
                      mealPayments: [
                        ...(current.mealPayments ?? []).filter((p) => p.cuisine !== cuisine),
                        {
                          cuisine,
                          qty_paid: qty,
                          paid_at: new Date().toISOString(),
                          source: "guest_reported",
                          state: "paid_reported",
                          method,
                        },
                      ],
                    }
                  : current,
              )
            }
          />
        )}

        {rsvpAttending && rsvp?.attendance_mode !== "zoom" && (
          <>
            {savedSelections.length > 0 && (
              <Card className="p-7 space-y-3">
                <h2 className="font-display text-2xl">Your catered meal order</h2>
                <ul className="divide-y divide-border">
                  {savedSelections.map((s) => (
                    <li key={String(s.cuisine)} className="py-2 text-sm flex items-center gap-3">
                      <span className="font-display text-lg w-8 text-terracotta">
                        {Number(s.qty) || 0}×
                      </span>
                      <span className="flex-1 text-ink">{String(s.cuisine)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Numbers are locked in with the restaurants. To change anything, reply to the
                  person who invited you.
                </p>
              </Card>
            )}
            <MealWaitingListRequest
              token={invitation.rsvp_token}
              defaultName={invitation.guest_name}
              defaultPhone={invitation.guest_phone ?? ""}
              cuisines={cuisines}
              restaurants={restaurants}
              onPhotoClick={setLightbox}
            />
          </>
        )}


        <Card className="p-7 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Event</p>
            <h2 className="font-display text-3xl text-ink mt-1">{ev.title}</h2>
          </div>
          <div className="grid gap-3 text-sm text-ink">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold" />
              {formatEventDateRange(ev.starts_at, ev.ends_at)}
            </span>
            {ev.location && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold" />
                {ev.location}
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              <Users className="w-4 h-4 text-gold" />
              {rsvp?.status === "no"
                ? "Declined"
                : rsvp?.attendance_mode === "zoom"
                  ? "Attending virtually (Zoom)"
                  : `Attending in person · party of ${rsvp?.party_size ?? 1}${rsvp?.ordering_food === true ? " · ordering food" : rsvp?.ordering_food === false ? " · not ordering food" : ""}`}
            </span>
          </div>
          <div className="rounded-md border border-border bg-cream/40 p-4 text-sm space-y-2">
            <p>
              <strong>Name:</strong> {invitation.guest_name}
            </p>
            {invitation.guest_phone && (
              <p>
                <strong>Phone:</strong> {invitation.guest_phone}
              </p>
            )}
            {rsvp?.invited_by && (
              <p>
                <strong>Invited by:</strong> {rsvp.invited_by}
              </p>
            )}
          </div>
          <Link to="/rsvp/$token" params={{ token: invitation.rsvp_token }}>
            <Button className="bg-ink text-cream hover:bg-ink/90 w-full">
              {orderDone ? "Update RSVP or order" : "Update RSVP or place a meal order"}
            </Button>
          </Link>
        </Card>
        

        <Card className="p-5 space-y-3">

          <h2 className="font-display text-2xl">Want to help?</h2>
          <p className="text-sm text-muted-foreground">
            We need volunteers for set up, clean up, hospitality and more. Pick any roles you'd like
            to help with.
          </p>
          <Link to="/volunteer">
            <Button className="w-full bg-terracotta text-cream hover:bg-terracotta/90">
              Volunteer to help
            </Button>
          </Link>
        </Card>
        <Dialog open={lightbox !== null} onOpenChange={(o) => !o && setLightbox(null)}>
          <DialogContent className="max-w-2xl p-2 bg-ink border-ink">
            <DialogTitle className="sr-only">Cultural meal photo</DialogTitle>
            {lightbox && (
              <img src={lightbox} alt="Cultural meal" className="w-full h-auto rounded-md" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-10">
      <Card className="p-10 text-center max-w-md space-y-4">
        <h1 className="font-display text-3xl">No RSVP on file</h1>
        <p className="text-muted-foreground">
          We couldn't find an RSVP linked to your phone number. Make sure your RSVP uses the same
          phone number as your account.
        </p>
        <Link to="/rsvp">
          <Button className="bg-ink text-cream hover:bg-ink/90">RSVP now</Button>
        </Link>
      </Card>
    </div>
  );
}
