import { Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyInvitation, submitCuisinePreorder } from "@/lib/invitations.functions";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Check, X, UtensilsCrossed, Minus, Plus } from "lucide-react";
import { withTimeout } from "@/lib/async-safety";
import { toast } from "sonner";

type CuisineSelection = { cuisine: string; qty: number };
type MyRsvpData = {
  invitation: {
    rsvp_token: string;
    guest_name: string;
    guest_email?: string | null;
    guest_phone?: string | null;
    events: { title: string; starts_at: string; location?: string | null };
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
    const cuisines = [
      { key: "Myanmar", label: "Myanmar/Burmese" },
      { key: "African", label: "African" },
      { key: "Indonesian", label: "Indonesian" },
    ];
    const preorderTotal = Object.values(cuisineCounts).reduce(
      (sum, qty) => sum + (Number(qty) || 0),
      0,
    );
    const menuOrderDone = orderItems.length > 0;
    const orderDone = menuOrderDone || preorderTotal > 0;
    const setCuisineQty = (cuisine: string, qty: number) => {
      setCuisineCounts((current) => ({
        ...current,
        [cuisine]: Math.max(0, Math.min(20, qty || 0)),
      }));
    };
    const saveMeals = async () => {
      setSavingMeals(true);
      try {
        const selections = Object.entries(cuisineCounts)
          .filter(([, qty]) => qty > 0)
          .map(([cuisine, qty]) => ({ cuisine, qty }));
        await saveCuisinePreorder({ data: { token: invitation.rsvp_token, selections } });
        setData((current) => (current ? { ...current, preorder: { selections } } : current));
        toast.success("Meal order saved.");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Could not save meal order");
      } finally {
        setSavingMeals(false);
      }
    };

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        
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
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-80">Pre-order</p>
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
              <h2 className="font-display text-2xl">What you pre-ordered</h2>
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

        {rsvpAttending && rsvp?.attendance_mode !== "zoom" && (
          <Card className="p-7 space-y-5">
            <div>
              <h2 className="font-display text-2xl">
                Pre-order your cultural meal
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cultural meals are in the twenty to twenty-five dollar range per meal. Click below to pre-order. We will negotiate with the restaurant once we have a meal count total. You'll be updated with the menu to confirm in the coming weeks and to pay the restaurant direct.
              </p>
            </div>
            <div className="space-y-3">
              {cuisines.map((cuisine) => {
                const qty = cuisineCounts[cuisine.key] ?? 0;
                const selected = qty > 0;
                return (
                  <div
                    key={cuisine.key}
                    className="rounded-md border border-border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base font-display text-ink">{cuisine.label}</span>
                      <div className="grid grid-cols-2 gap-2 w-36">
                        <button
                          type="button"
                          onClick={() => setCuisineQty(cuisine.key, qty > 0 ? qty : 1)}
                          className={`rounded-md border-2 px-3 py-2 text-sm font-medium transition ${
                            selected
                              ? "border-terracotta bg-terracotta text-cream"
                              : "border-border bg-card hover:border-terracotta/40"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setCuisineQty(cuisine.key, 0)}
                          className={`rounded-md border-2 px-3 py-2 text-sm font-medium transition ${
                            !selected
                              ? "border-ink bg-ink text-cream"
                              : "border-border bg-card hover:border-ink/40"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        How many meals do you want?
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setCuisineQty(cuisine.key, qty - 1)}
                          aria-label={`Fewer ${cuisine.label} meals`}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-10 text-center font-display text-2xl text-ink">
                          {qty}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setCuisineQty(cuisine.key, qty + 1)}
                          aria-label={`More ${cuisine.label} meals`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Total meals: <span className="font-semibold text-ink">{preorderTotal}</span>
              </p>
              <Button
                onClick={saveMeals}
                disabled={savingMeals}
                className="bg-terracotta text-cream hover:bg-terracotta/90"
              >
                {savingMeals ? "Saving…" : "Save meal order"}
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-7 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Event</p>
            <h2 className="font-display text-3xl text-ink mt-1">{ev.title}</h2>
          </div>
          <div className="grid gap-3 text-sm text-ink">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold" />
              {new Date(ev.starts_at).toLocaleString()}
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
            {invitation.guest_email && (
              <p>
                <strong>Email:</strong> {invitation.guest_email}
              </p>
            )}
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
              {orderDone ? "Update RSVP or order" : "Update RSVP or place a pre-order"}
            </Button>
          </Link>
        </Card>
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
