import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getInvitationByToken,
  submitRsvp,
  submitCuisinePreorder,
} from "@/lib/invitations.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommitteePicker } from "@/components/committee-picker";


import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Check,
  X,
  Minus,
  Plus,
  ArrowLeft,
  Users,
  Video,
  UtensilsCrossed,
} from "lucide-react";
import { SharedPhotoAlbum } from "@/components/shared-photo-album";
import { InvitationPage } from "@/components/invitation-page";
import { withTimeout } from "@/lib/async-safety";
import { clearDraftScope, useDraftState } from "@/hooks/use-draft-state";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MEAL_INTRO_COPY } from "@/lib/meal-pricing";
import {
  MealPriceNote,
  MealRestaurantContact,
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


export const Route = createFileRoute("/rsvp/$token")({
  head: () => ({ meta: [{ title: "Your invitation — RSVP" }] }),
  component: RsvpPage,
});

type CuisineSelection = { cuisine: string; qty: number };
type RsvpTokenData = {
  invitation: {
    guest_name: string;
    guest_phone?: string | null;
    events: {
      title: string;
      description?: string | null;
      starts_at: string;
      ends_at?: string | null;
      location?: string | null;
    };
  };
  rsvp?: {
    responded_at?: string | null;
    status?: string;
    party_size?: number | null;
    attendance_mode?: string | null;
    ordering_food?: boolean | null;
    invited_by?: string | null;
  } | null;
  order?: { items?: unknown; total?: number | string | null; notes?: string | null } | null;
  preorder?: { selections?: unknown } | null;
  mealStatuses?: Array<{ cuisine: string; confirmed: boolean; confirmed_at: string | null }> | null;
  mealPayments?: Array<{
    cuisine: string;
    qty?: number | null;
    qty_paid: number;
    paid_at: string | null;
    source?: string | null;
    method?: string | null;
    state?: "paid_confirmed" | "paid_reported";
    confirmed_at?: string | null;
  }> | null;
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

function RsvpPage() {
  const { token } = useParams({ from: "/rsvp/$token" });
  const fetchInv = useServerFn(getInvitationByToken);
  const submit = useServerFn(submitRsvp);
  const saveCuisinePreorder = useServerFn(submitCuisinePreorder);
  const rsvpDraftScope = `rsvp-token:${token}:response`;
  const orderDraftScope = `rsvp-token:${token}:order`;

  const [data, setData] = useState<RsvpTokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  const [status, setStatus] = useDraftState<"yes" | "no">(rsvpDraftScope, "status", "yes");
  const [attendanceMode, setAttendanceMode] = useDraftState<"in_person" | "zoom">(
    rsvpDraftScope,
    "attendanceMode",
    "in_person",
  );
  const [partySize, setPartySize] = useDraftState(rsvpDraftScope, "partySize", 1);
  const [guestName, setGuestName] = useDraftState(rsvpDraftScope, "guestName", "");
  const [guestPhone, setGuestPhone] = useDraftState(rsvpDraftScope, "guestPhone", "");
  const [orderingFood, setOrderingFood] = useDraftState<"yes" | "no" | "">(
    rsvpDraftScope,
    "orderingFood",
    "",
  );
  const [invitedBy, setInvitedBy] = useDraftState(rsvpDraftScope, "invitedBy", "");
  useEffect(() => {
    // Clear legacy "Other…" sentinel from older drafts.
    if (invitedBy === "__other__") setInvitedBy("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitedBy]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const { data: restaurants } = useMealRestaurants();

  const [mealStatuses, setMealStatuses] = useState<
    Array<{ cuisine: string; confirmed: boolean; confirmed_at: string | null }>
  >([]);
  // Payments already on record (restaurant-confirmed or reported by the guest).
  const [mealPayments, setMealPayments] = useState<
    Array<{ cuisine: string; qty_paid: number; paid_at: string | null; source?: string | null; state?: "paid_confirmed" | "paid_reported"; confirmed_at?: string | null }>
  >([]);
  // Saved meals with no payment recorded yet — the "I already paid" list.
  const [savedMeals, setSavedMeals] = useState<Array<{ cuisine: string; qty: number }>>([]);
  const [cuisineCounts, setCuisineCounts] = useDraftState<Record<string, number>>(
    orderDraftScope,
    "cuisineCounts",
    {},
  );
  const [cuisineChoice, setCuisineChoice] = useDraftState<Record<string, "yes" | "no">>(
    orderDraftScope,
    "cuisineChoice",
    {},
  );
  const [savingMeals, setSavingMeals] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadError(null);
    setSlow(false);
    // Purge malformed drafts so a bad older payload can't wedge the page.
    try {
      const keys = [`platform-draft:${rsvpDraftScope}`, `platform-draft:${orderDraftScope}`];
      for (const k of keys) {
        const raw = window.localStorage.getItem(k);
        if (raw) JSON.parse(raw);
      }
    } catch {
      window.localStorage.removeItem(`platform-draft:${rsvpDraftScope}`);
      window.localStorage.removeItem(`platform-draft:${orderDraftScope}`);
    }
    const slowTimer = window.setTimeout(() => {
      if (alive) setSlow(true);
    }, 6000);
    const fallback = window.setTimeout(() => {
      if (alive) {
        setLoading(false);
        setLoadError((prev) => prev ?? "Timed out loading your invitation.");
      }
    }, 12000);
    (async () => {
      try {
        const r = (await withTimeout(fetchInv({ data: { token } }), 10000)) as RsvpTokenData;
        if (!alive) return;
        setData(r);
        setGuestName(r.invitation.guest_name ?? "");
        setGuestPhone(r.invitation.guest_phone ?? "");
        if (r.rsvp) {
          setStatus(r.rsvp.status === "no" ? "no" : "yes");
          setPartySize(r.rsvp.party_size ?? 1);
          setAttendanceMode((r.rsvp.attendance_mode as "in_person" | "zoom") ?? "in_person");
          setOrderingFood(
            r.rsvp.ordering_food === true ? "yes" : r.rsvp.ordering_food === false ? "no" : "",
          );
          setInvitedBy(r.rsvp.invited_by ?? "");
        }
        setMealStatuses(
          (r.mealStatuses ?? []).filter((m) => m.confirmed),
        );
        setMealPayments((r.mealPayments ?? []).filter((p) => Number(p.qty_paid) > 0));
        setSavedMeals(
          Array.isArray(r.preorder?.selections)
            ? (r.preorder!.selections as unknown[])
                .filter(isCuisineSelection)
                .map((sel) => ({ cuisine: sel.cuisine, qty: sel.qty }))
                .filter((sel) => sel.qty > 0)
            : [],
        );
        const selections: unknown = r.preorder?.selections;
        if (Array.isArray(selections)) {
          const restoredCounts = selections
            .filter(isCuisineSelection)
            .reduce<Record<string, number>>((acc, item) => {
              if (item.qty > 0) acc[item.cuisine] = item.qty;
              return acc;
            }, {});
          setCuisineCounts(restoredCounts);
        }
      } catch (e: unknown) {
        if (alive) setLoadError(e instanceof Error ? e.message : "Could not load your invitation.");
      } finally {
        if (alive) setLoading(false);
        window.clearTimeout(fallback);
        window.clearTimeout(slowTimer);
      }
    })();
    return () => {
      alive = false;
      window.clearTimeout(fallback);
      window.clearTimeout(slowTimer);
    };
  }, [token, fetchInv]);


  const handleSubmit = async () => {
    try {
      const finalInvitedBy = invitedBy.trim();
      if (!finalInvitedBy) return toast.error("Please enter who invited you");

      // Derive ordering_food from the meal pre-order: any meals = yes, none = no.
      const mealCount = Object.values(cuisineCounts).reduce(
        (sum, qty) => sum + (Number(qty) || 0),
        0,
      );
      const orderingFoodBool =
        status === "yes" && attendanceMode === "in_person"
          ? mealCount > 0 || orderingFood === "yes"
          : null;
      const res = await submit({
        data: {
          token,
          guest_name: guestName.trim(),
          guest_phone: guestPhone.trim(),
          status,
          party_size: partySize,
          attendance_mode: attendanceMode,
          ordering_food: orderingFoodBool,
          dietary_notes: "",
          invited_by: finalInvitedBy,
        },
      });
      clearDraftScope(rsvpDraftScope);
      if (
        res &&
        typeof res === "object" &&
        "waitlisted" in res &&
        Boolean((res as { waitlisted?: boolean }).waitlisted)
      ) {
        toast.success(
          "You're on the waiting list because in-person attendance has reached the building capacity. We'll be in touch if space opens up.",
        );
      } else {
        toast.success("RSVP saved — thank you!");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save RSVP");
    }
  };

  const handleCuisineOrder = async () => {
    const savedMap = new Map(savedMeals.map((s) => [String(s.cuisine), Number(s.qty) || 0]));
    const keys = Array.from(
      new Set([...Object.keys(cuisineCounts), ...savedMap.keys()]),
    );
    const submitted = keys.map((cuisine) => ({
      cuisine,
      qty: Math.max(0, Number(cuisineCounts[cuisine] ?? savedMap.get(cuisine) ?? 0) || 0),
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
    try {
      setSavingMeals(true);
      const result = (await saveCuisinePreorder({
        data: {
          token,
          selections: submitted,
          confirmed_removals: reductions.map((r) => r.cuisine),
        },
      })) as { selections?: Array<{ cuisine: string; qty: number }> };
      const selections = result?.selections ?? submitted.filter((s) => s.qty > 0);
      setSavedMeals(selections);
      setCuisineCounts(
        selections.reduce<Record<string, number>>((acc, s) => {
          acc[s.cuisine] = s.qty;
          return acc;
        }, {}),
      );
      clearDraftScope(orderDraftScope);
      toast.success(selections.length === 0 ? "Meal order cancelled" : "Meal order saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save meal order");
    } finally {
      setSavingMeals(false);
    }
  };


  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center text-muted-foreground">
        <p>Loading your invitation…</p>
        {slow && (
          <div className="max-w-sm space-y-3 rounded-lg border border-border bg-card p-5 text-sm text-ink">
            <p>Taking longer than expected. The connection may be slow.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => window.location.reload()}>Reload page</Button>
              <Button variant="outline" asChild>
                <Link to="/">Back to invitation</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  if (loadError || !data?.invitation) {
    if (loadError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="max-w-sm space-y-3 rounded-lg border border-border bg-card p-5 text-sm text-ink">
            <p className="font-semibold">We couldn't load your invitation.</p>
            <p className="text-muted-foreground">{loadError}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => window.location.reload()}>Reload page</Button>
              <Button variant="outline" asChild>
                <Link to="/">Back to invitation</Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return <InvitationPage />;
  }

  const ev = data.invitation.events;
  const cuisines: { key: string; label: string; photos?: string[]; note?: string }[] = [
    { key: "Myanmar", label: "Myanmar/Burmese", photos: myanmarPhotos },
    { key: "African", label: "African", photos: africanPhotos },
    { key: "Indonesian", label: "Indonesian", photos: indonesianPhotos },
  ];
  const preorderTotal = Object.values(cuisineCounts).reduce(
    (sum, qty) => sum + (Number(qty) || 0),
    0,
  );
  const setCuisineQty = (cuisine: string, qty: number) => {
    setCuisineCounts({ ...cuisineCounts, [cuisine]: Math.max(0, Math.min(20, qty || 0)) });
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="mx-auto max-w-3xl px-4 py-5 space-y-5 sm:px-6 sm:py-12 sm:space-y-6">
        <SharedPhotoAlbum guestName={data.invitation.guest_name} />
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to invitation
        </Link>

        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">You're invited</p>
          <h1 className="font-display text-5xl mt-3 text-ink">{ev.title}</h1>
        </div>


        <Card className="p-7 space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
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
          </div>
        </Card>


        {(() => {
          const rsvp = data.rsvp;
          const orderItems: Array<{ name?: string; quantity?: number; price?: number }> =
            Array.isArray(data.order?.items) ? data.order.items : [];
          const rsvpDone = !!rsvp?.responded_at;
          const rsvpYes = rsvp?.status === "yes";
          const orderDone = orderItems.length > 0;
          return (
            <>
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
                    {orderDone && (
                      <p className="text-xs opacity-90 mt-0.5">
                        {orderItems.reduce((s, i) => s + (i.quantity ?? 0), 0)} item
                        {orderItems.length === 1 ? "" : "s"} · $
                        {Number(data.order?.total ?? 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {orderDone && (
                <Card className="p-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl">What you ordered</h2>
                    <span className="font-display text-xl text-terracotta">
                      ${Number(data.order?.total ?? 0).toFixed(2)}
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
                  {data.order?.notes && (
                    <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                      Note: {data.order.notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground pt-1">
                    You can change your order below at any time.
                  </p>
                </Card>
              )}
            </>
          );
        })()}

        <Card className="p-7 space-y-5">
          <h2 className="font-display text-2xl">Will you be joining us?</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { v: "in_person", icon: Users, label: "In person", sub: "Attend at the venue" },
              { v: "zoom", icon: Video, label: "Zoom", sub: "Attend virtually" },
              { v: "no", icon: X, label: "Decline", sub: "Cannot attend" },
            ].map((o) => (
              <Button
                type="button"
                variant="outline"
                key={o.v}
                onClick={() => {
                  if (o.v === "no") {
                    setStatus("no");
                    return;
                  }
                  setStatus("yes");
                  setAttendanceMode(o.v as "in_person" | "zoom");
                  if (o.v === "zoom") setPartySize(1);
                }}
                className={`h-auto min-h-24 rounded-md border-2 p-4 transition flex flex-col items-center gap-1.5 whitespace-normal ${
                  (status === "no" ? "no" : attendanceMode) === o.v
                    ? o.v === "in_person"
                      ? "border-terracotta bg-terracotta text-cream hover:bg-terracotta/90"
                      : o.v === "zoom"
                        ? "border-teal-500 bg-teal-500 text-white hover:bg-teal-500/90"
                        : "border-ink bg-ink text-cream hover:bg-ink/90"
                    : "border-border bg-card text-ink hover:border-ink/40 hover:bg-card"
                }`}
              >
                <o.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{o.label}</span>
                <span className="text-xs font-normal opacity-80">{o.sub}</span>
              </Button>
            ))}
          </div>
          {status !== "no" && (
            <>
              {attendanceMode === "in_person" && (
                <div className="space-y-1.5">
                  <Label>Party size (including you)</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setPartySize(Math.max(1, partySize - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-display text-2xl w-10 text-center">{partySize}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setPartySize(Math.min(20, partySize + 1))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Seating is limited — please count everyone in your group.
                  </p>
                </div>
              )}
            </>
          )}
          <div className="space-y-1.5">
            <div className="rounded-md border-2 border-terracotta bg-cream/50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
                Required before RSVP
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="guest-name-confirm" className="text-base font-semibold text-ink">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guest-name-confirm"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your full name"
                  className="h-14 border-2 border-ink bg-card text-lg text-ink"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guest-phone-confirm" className="text-base font-semibold text-ink">
                  Mobile number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guest-phone-confirm"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="h-14 border-2 border-ink bg-card text-lg text-ink"
                />
              </div>
            </div>
            <Label htmlFor="invited-by">
              Invited by <span className="text-destructive">*</span>
            </Label>
            <CommitteePicker
              id="invited-by"
              value={invitedBy}
              onChange={setInvitedBy}
            />
            <p className="text-xs text-muted-foreground">
              Type the person&apos;s name, then choose the matching suggestion.
            </p>

          </div>
        </Card>

        {mealPayments.length > 0 && (
          <Card className="p-7 space-y-3 border-2 border-emerald-600">
            <h2 className="font-display text-2xl text-ink">Meal payment on record</h2>
            <ul className="divide-y divide-border">
              {mealPayments.map((p) => {
                  const confirmed = p.state === "paid_confirmed" || (p.source ?? "restaurant") === "restaurant";
                return (
                  <li key={p.cuisine} className="py-2 text-sm flex items-center gap-3">
                    <span className="font-display text-lg w-8 text-emerald-700">{p.qty_paid}×</span>
                    <span className="flex-1 text-ink">{p.cuisine}</span>
                    <span className={confirmed ? "text-emerald-700" : "text-terracotta"}>
                      {confirmed ? "Paid" : "Awaiting restaurant confirmation"}
                        {(confirmed ? p.confirmed_at || p.paid_at : p.paid_at) ? ` · ${new Date((confirmed ? p.confirmed_at || p.paid_at : p.paid_at) as string).toLocaleDateString()}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <GuestMealPaymentReport
          token={token}
          unpaid={savedMeals.filter(
            (m) => !mealPayments.some((p) => p.cuisine === m.cuisine && Number(p.qty_paid) > 0),
          )}
          onReported={(cuisine, qty) =>
            setMealPayments((current) => [
              ...current.filter((p) => p.cuisine !== cuisine),
              { cuisine, qty_paid: qty, paid_at: new Date().toISOString(), source: "guest_reported", state: "paid_reported" },
            ])
          }
        />

        {status === "yes" && attendanceMode === "in_person" && (
          <>
            {(savedMeals.length > 0 || mealStatuses.length > 0) && (
              <Card className="p-7 space-y-3">
                <h2 className="font-display text-2xl">Your catered meal order</h2>
                <ul className="divide-y divide-border">
                  {savedMeals.map((m) => (
                    <li key={m.cuisine} className="py-2 text-sm flex items-center gap-3">
                      <span className="font-display text-lg w-8 text-terracotta">{m.qty}×</span>
                      <span className="flex-1 text-ink">{m.cuisine}</span>
                      {mealStatuses.some((s) => s.cuisine === m.cuisine) && (
                        <span className="text-terracotta">Confirmed by the restaurant</span>
                      )}
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
              token={token}
              defaultName={guestName}
              defaultPhone={guestPhone}
              cuisines={cuisines}
              restaurants={restaurants}
              onPhotoClick={setLightbox}
            />
          </>
        )}


        


        <Card className="p-5 space-y-4 border-terracotta/30 bg-card">
          <Button
            onClick={handleSubmit}
            className="bg-ink text-cream hover:bg-ink/90 w-full h-12 text-base"
          >
            Save RSVP
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Need to change your RSVP later? Open this same invitation link again, or sign in from the top of the page with your phone number.
          </p>
        </Card>
      </div>
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-2xl bg-ink border-ink p-2">
          <DialogTitle className="sr-only">Meal photo</DialogTitle>
          {lightbox && <img src={lightbox} alt="Meal" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

