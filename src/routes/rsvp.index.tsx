import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getPublicRsvpByPhone, submitPublicRsvp } from "@/lib/invitations.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


import { useDraftState } from "@/hooks/use-draft-state";
import { Check, X, Minus, Plus, ArrowLeft, Users, Video } from "lucide-react";

export const Route = createFileRoute("/rsvp/")({
  head: () => ({ meta: [{ title: "RSVP" }] }),
  component: PreviewPage,
});

const ev = {
  title: "A Taste of Special Conventions",
};

type CuisineSelection = { cuisine: string; qty: number };

function isSelection(value: unknown): value is CuisineSelection {
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

function PreviewPage() {
  const draftScope = "rsvp-public";
  const [status, setStatus] = useDraftState<"yes" | "no">(draftScope, "status", "yes");
  const [attendanceMode, setAttendanceMode] = useDraftState<"in_person" | "zoom">(
    draftScope,
    "attendanceMode",
    "in_person",
  );
  const [partySize, setPartySize] = useDraftState(draftScope, "partySize", 2);
  const [name, setName] = useDraftState(draftScope, "name", "");
  const [phone, setPhone] = useDraftState(draftScope, "phone", "");
  const [invitedBy, setInvitedBy] = useDraftState(draftScope, "invitedBy", "");
  const [invitedByOther, setInvitedByOther] = useDraftState(draftScope, "invitedByOther", "");
  const [cuisineCounts, setCuisineCounts] = useDraftState<Record<string, number>>(
    draftScope,
    "cuisineCounts",
    {},
  );
  const [wantsCuisine, setWantsCuisine] = useDraftState<"yes" | "no" | "">(
    draftScope,
    "wantsCuisine",
    "",
  );
  const [submittedAt, setSubmittedAt] = useDraftState<string | null>(
    draftScope,
    "submittedAt",
    null,
  );
  const [inviters, setInviters] = useState<{ id: string; name: string }[]>([]);
  const cuisines = [
    { key: "Myanmar", label: "Myanmar/Burmese" },
    { key: "African", label: "African" },
    { key: "Indonesian", label: "Indonesian" },
  ];
  const phoneDigits = phone.replace(/\D/g, "");
  const canChooseMeals = name.trim().length > 0 && phoneDigits.length >= 7;

  useEffect(() => {
    supabase.rpc("get_public_inviters").then(({ data }) => {
      const list = (data ?? []).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
      setInviters(list);
    });
  }, []);


  const save = useServerFn(submitPublicRsvp);
  const lookupRsvp = useServerFn(getPublicRsvpByPhone);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasSubmitted = saved || Boolean(submittedAt);

  const restoreByPhone = async () => {
    if (phoneDigits.length < 7) return toast.error("Enter your mobile number first");
    setRestoring(true);
    try {
      const result = await lookupRsvp({ data: { phone } });
      if (!result.invitation || !result.rsvp) {
        return toast.error("No RSVP was found for that mobile number");
      }
      setName(result.invitation.guest_name ?? name);
      setPhone(result.invitation.guest_phone ?? phone);
      setStatus(result.rsvp.status === "no" ? "no" : "yes");
      setAttendanceMode(result.rsvp.attendance_mode === "zoom" ? "zoom" : "in_person");
      setPartySize(result.rsvp.party_size ?? 1);
      setInvitedBy(result.rsvp.invited_by ?? "");
      const restoredCounts = Array.isArray(result.preorder?.selections)
        ? result.preorder.selections
            .filter(isSelection)
            .reduce<Record<string, number>>((acc, item) => {
              acc[item.cuisine] = item.qty;
              return acc;
            }, {})
        : {};
      setCuisineCounts(restoredCounts);
      setWantsCuisine(Object.values(restoredCounts).some((n) => n > 0) ? "yes" : "no");
      setSubmittedAt(result.rsvp.responded_at ?? new Date().toISOString());
      setSaved(false);
      toast.success("Your RSVP was restored.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not restore RSVP");
    } finally {
      setRestoring(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Please enter your full name");
    if (phoneDigits.length < 7) return toast.error("Please enter your mobile number");
    const finalInvitedBy = invitedBy === "__other__" ? invitedByOther.trim() : invitedBy;
    if (!finalInvitedBy) return toast.error("Please select who invited you");
    setSaving(true);

    try {
      const selections =
        status === "yes" && attendanceMode === "in_person"
          ? Object.entries(cuisineCounts)
              .filter(([, qty]) => qty > 0)
              .map(([cuisine, qty]) => ({ cuisine, qty }))
          : [];
      if (selections.length > 0 && !canChooseMeals) {
        return toast.error("Please enter your full name and mobile number before choosing meals");
      }
      const orderingFoodBool =
        status === "yes" && attendanceMode === "in_person" ? selections.length > 0 : null;
      const result = await save({
        data: {
          guest_name: name.trim() || "Guest",
          guest_phone: phone.trim() || null,
          password: phoneDigits,
          status,
          party_size: partySize,
          attendance_mode: attendanceMode,
          ordering_food: orderingFoodBool,
          invited_by: finalInvitedBy,
          cuisine_selections: selections,
        },
      });
      setSaved(true);
      setSubmittedAt(new Date().toISOString());
      if (
        result &&
        typeof result === "object" &&
        "waitlisted" in result &&
        Boolean((result as { waitlisted?: boolean }).waitlisted)
      ) {
        toast.success(
          "You're on the waiting list because in-person attendance has reached the building capacity. We'll be in touch if space opens up.",
        );
      } else {
        toast.success("RSVP saved — thank you!");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save RSVP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-6">
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
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile number <span className="text-destructive">*</span></Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          {status === "no" && (
            <div className="rounded-md border-2 border-terracotta bg-terracotta/5 p-4 space-y-3">
              <p className="text-sm text-ink">
                Sorry you can't join us in person. Would you like to attend virtually on Zoom instead?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-terracotta text-cream hover:bg-terracotta/90"
                  onClick={() => {
                    setStatus("yes");
                    setAttendanceMode("zoom");
                    setPartySize(1);
                  }}
                >
                  <Video className="w-4 h-4 mr-2" /> Yes, join by Zoom
                </Button>
                <span className="text-xs text-muted-foreground self-center">
                  Or continue below to decline entirely.
                </span>
              </div>
            </div>
          )}
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
            <div className="rounded-md border-2 border-terracotta bg-cream/50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
                Required before RSVP
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="name-confirm" className="text-base font-semibold text-ink">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name-confirm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="h-14 border-2 border-ink bg-card text-lg text-ink"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone-confirm" className="text-base font-semibold text-ink">
                  Mobile number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone-confirm"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="h-14 border-2 border-ink bg-card text-lg text-ink"
                />
              </div>
            </div>
            <Label htmlFor="invited-by">Invited by <span className="text-destructive">*</span></Label>
            <Input
              id="invited-by"
              value={invitedBy}
              onChange={(e) => setInvitedBy(e.target.value)}
              placeholder="Type the name of the person who invited you"
              maxLength={120}
            />

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
            {!canChooseMeals && (
              <p className="text-sm text-terracotta">
                Enter your full name and mobile number above before choosing meals.
              </p>
            )}
            <div className="space-y-3">
              {cuisines.map((cuisine) => {
                const qty = cuisineCounts[cuisine.key] ?? 0;
                const selected = qty > 0;
                const setQty = (n: number) =>
                  canChooseMeals
                    ? setCuisineCounts({
                        ...cuisineCounts,
                        [cuisine.key]: Math.max(0, Math.min(20, n)),
                      })
                    : toast.error(
                        "Please enter your full name and mobile number before choosing meals",
                      );
                return (
                  <div
                    key={cuisine.key}
                    className={`rounded-md border border-border bg-card p-4 space-y-3 ${canChooseMeals ? "" : "opacity-60"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-base font-display text-ink">{cuisine.label}</Label>
                      <div className="grid grid-cols-2 gap-2 w-36">
                        <button
                          type="button"
                          disabled={!canChooseMeals}
                          onClick={() => setQty(qty > 0 ? qty : 1)}
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
                          disabled={!canChooseMeals}
                          onClick={() => setQty(0)}
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
                          disabled={!canChooseMeals}
                          onClick={() => setQty(qty - 1)}
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
                          disabled={!canChooseMeals}
                          onClick={() => setQty(qty + 1)}
                          aria-label={`More ${cuisine.label} meals`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground italic">Menu details coming soon.</p>
            </div>
          </Card>
        )}

        <Card className="p-5 space-y-4 border-terracotta/30 bg-card">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-ink text-cream hover:bg-ink/90 w-full h-12 text-base"
          >
            {saving ? "Submitting…" : "Submit RSVP"}
          </Button>
          {hasSubmitted && (
            <div className="rounded-md border border-border bg-cream/40 p-4 text-sm text-ink space-y-3">
              <p className="font-medium">
                If you need to modify your RSVP, use the login button with your phone number for access to your account.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Log in
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
