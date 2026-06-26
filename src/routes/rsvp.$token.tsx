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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { InvitationPage } from "@/components/invitation-page";
import { withTimeout } from "@/lib/async-safety";
import { clearDraftScope, useDraftState } from "@/hooks/use-draft-state";

export const Route = createFileRoute("/rsvp/$token")({
  head: () => ({ meta: [{ title: "Your invitation — RSVP" }] }),
  component: RsvpPage,
});

type CuisineSelection = { cuisine: string; qty: number };
type RsvpTokenData = {
  invitation: {
    guest_name: string;
    guest_email?: string | null;
    guest_phone?: string | null;
    events: {
      title: string;
      description?: string | null;
      starts_at: string;
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
  const [invitedByOther, setInvitedByOther] = useDraftState(rsvpDraftScope, "invitedByOther", "");
  const [inviters, setInviters] = useState<{ id: string; name: string }[]>([]);
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
    const fallback = window.setTimeout(() => {
      if (alive) setLoading(false);
    }, 10000);
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
      } finally {
        if (alive) setLoading(false);
      }
      const { data: iv } = await withTimeout(supabase.rpc("get_public_inviters"), 10000);
      if (!alive) return;
      const sorted = (iv ?? []).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
      setInviters(sorted);
    })()
      .catch(() => {
        if (alive) setLoading(false);
      })
      .finally(() => window.clearTimeout(fallback));
    return () => {
      alive = false;
      window.clearTimeout(fallback);
    };
  }, [token, fetchInv]);

  const handleSubmit = async () => {
    try {
      const phoneDigits = guestPhone.replace(/\D/g, "");
      if (!guestName.trim()) return toast.error("Please enter your full name");
      if (phoneDigits.length < 7) return toast.error("Please enter your mobile number");
      const finalInvitedBy = invitedBy === "__other__" ? invitedByOther.trim() : invitedBy;
      if (!finalInvitedBy) return toast.error("Please select who invited you");
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
          "You're on the waiting list — seats with your inviter are full. We'll be in touch if one opens up.",
        );
      } else {
        toast.success("RSVP saved — thank you!");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save RSVP");
    }
  };

  const handleCuisineOrder = async () => {
    const selections = Object.entries(cuisineCounts)
      .filter(([, qty]) => qty > 0)
      .map(([cuisine, qty]) => ({ cuisine, qty }));
    try {
      setSavingMeals(true);
      await saveCuisinePreorder({ data: { token, selections } });
      clearDraftScope(orderDraftScope);
      toast.success("Meal order saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save meal order");
    } finally {
      setSavingMeals(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  if (!data?.invitation) return <InvitationPage />;
  const ev = data.invitation.events;
  const cuisines = [
    { key: "Myanmar", label: "Myanmar/Burmese" },
    { key: "African", label: "African" },
    { key: "Indonesian", label: "Indonesian" },
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
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to invitation
        </Link>

        <Card className="p-4 space-y-4 border-2 border-terracotta bg-card shadow-glow sm:p-7">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-terracotta">
              Required before RSVP
            </p>
            <h2 className="font-display text-3xl text-ink">Your name and mobile number</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-name" className="text-base font-semibold text-ink">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your full name"
              className="h-14 border-2 border-ink bg-cream text-lg text-ink placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-terracotta"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-phone" className="text-base font-semibold text-ink">
              Mobile number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="guest-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="h-14 border-2 border-ink bg-cream text-lg text-ink placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-terracotta"
            />
          </div>
        </Card>
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">You're invited</p>
          <h1 className="font-display text-5xl mt-3 text-ink">{ev.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">Hello, {data.invitation.guest_name}</p>
        </div>

        <Card className="p-7 space-y-3">
          {ev.description && <p className="text-muted-foreground">{ev.description}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
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
          </div>
          <div className="rounded-md border border-border bg-cream/40 p-4 text-sm space-y-1">
            <p>
              <strong>Name:</strong> {data.invitation.guest_name}
            </p>
            {data.invitation.guest_email && (
              <p>
                <strong>Email:</strong> {data.invitation.guest_email}
              </p>
            )}
            {data.invitation.guest_phone && (
              <p>
                <strong>Phone:</strong> {data.invitation.guest_phone}
              </p>
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
                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-80">Pre-order</p>
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
                    <h2 className="font-display text-2xl">What you pre-ordered</h2>
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
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "yes", icon: Check, label: "Attending" },
              { v: "no", icon: X, label: "Decline" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setStatus(o.v as "yes" | "no")}
                className={`p-4 rounded-md border-2 transition flex flex-col items-center gap-2 ${
                  status === o.v
                    ? "border-ink bg-ink text-cream"
                    : "border-border bg-card hover:border-ink/40"
                }`}
              >
                <o.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{o.label}</span>
              </button>
            ))}
          </div>
          {status !== "no" && (
            <>
              <div className="space-y-1.5">
                <Label>How will you attend?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      v: "in_person",
                      icon: Users,
                      label: "In-person Attendance",
                      sub: "Limited seating",
                    },
                    { v: "zoom", icon: Video, label: "Virtual Attendance", sub: "Join on Zoom" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setAttendanceMode(o.v as "in_person" | "zoom")}
                      className={`p-4 rounded-md border-2 transition flex flex-col items-center gap-1.5 ${
                        attendanceMode === o.v
                          ? "border-ink bg-ink text-cream"
                          : "border-border bg-card hover:border-ink/40"
                      }`}
                    >
                      <o.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{o.label}</span>
                      <span
                        className={`text-[10px] uppercase tracking-widest ${attendanceMode === o.v ? "text-cream/70" : "text-muted-foreground"}`}
                      >
                        {o.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
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
            <Label htmlFor="invited-by">Invited by <span className="text-destructive">*</span></Label>
            <Select value={invitedBy || undefined} onValueChange={setInvitedBy}>
              <SelectTrigger id="invited-by">
                <SelectValue placeholder="Open to select" />
              </SelectTrigger>
              <SelectContent>
                {inviters.map((i) => (
                  <SelectItem key={i.id} value={i.name}>
                    {i.name}
                  </SelectItem>
                ))}
                <SelectItem value="__other__">Other…</SelectItem>
              </SelectContent>
            </Select>
            {invitedBy === "__other__" && (
              <Input
                className="mt-2"
                value={invitedByOther}
                onChange={(e) => setInvitedByOther(e.target.value)}
                placeholder="Type the name of the person who invited you"
              />
            )}
          </div>
        </Card>

        {status === "yes" && attendanceMode === "in_person" && (
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
                const choice = cuisineChoice[cuisine.key];
                const isYes = choice === "yes" || qty > 0;
                const isNo = choice === "no";
                return (
                  <div
                    key={cuisine.key}
                    className="rounded-md border border-border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-base font-display text-ink">{cuisine.label}</Label>
                      <div className="grid grid-cols-2 gap-2 w-36">
                        <button
                          type="button"
                          onClick={() => {
                            setCuisineChoice({ ...cuisineChoice, [cuisine.key]: "yes" });
                            setCuisineQty(cuisine.key, qty > 0 ? qty : 1);
                          }}
                          className={`rounded-md border-2 px-3 py-2 text-sm font-medium transition ${
                            isYes
                              ? "border-terracotta bg-terracotta text-cream"
                              : "border-border bg-card hover:border-terracotta/40"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCuisineChoice({ ...cuisineChoice, [cuisine.key]: "no" });
                            setCuisineQty(cuisine.key, 0);
                          }}
                          className={`rounded-md border-2 px-3 py-2 text-sm font-medium transition ${
                            isNo
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
              <span className="font-display text-2xl">Total meals: {preorderTotal}</span>
              <Button
                onClick={handleCuisineOrder}
                disabled={savingMeals}
                className="bg-terracotta text-cream hover:bg-terracotta/90"
              >
                {savingMeals ? "Saving…" : "Save meal order"}
              </Button>
            </div>
          </Card>
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
    </div>
  );
}
