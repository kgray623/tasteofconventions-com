import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getPublicRsvpByPhone, submitPublicRsvp } from "@/lib/invitations.functions";

import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommitteePicker } from "@/components/committee-picker";

import { useDraftState } from "@/hooks/use-draft-state";
import { Check, X, Minus, Plus, ArrowLeft, Users, Video } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import africanMeal1 from "@/assets/african-meal-1.jpg.asset.json";
import africanMeal2 from "@/assets/african-meal-2.jpg.asset.json";
import africanMeal3 from "@/assets/african-meal-3.jpg.asset.json";
import indonesianMeal1 from "@/assets/indonesian-meal-1.jpg.asset.json";
import indonesianMeal2 from "@/assets/indonesian-meal-2.jpg.asset.json";
import indonesianMeal3 from "@/assets/indonesian-meal-3.jpg.asset.json";

const africanPhotos = [africanMeal1.url, africanMeal2.url, africanMeal3.url];
const indonesianPhotos = [indonesianMeal1.url, indonesianMeal2.url, indonesianMeal3.url];

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
  useEffect(() => {
    // Clear legacy "Other…" sentinel from older drafts.
    if (invitedBy === "__other__") setInvitedBy("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitedBy]);
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
  const cuisines: Array<{ key: string; label: string; photos?: string[]; note?: string }> = [
    { key: "Myanmar", label: "Myanmar/Burmese", note: "Photos coming soon" },
    { key: "African", label: "African", photos: africanPhotos },
    { key: "Indonesian", label: "Indonesian", photos: indonesianPhotos },
  ];
  const [lightbox, setLightbox] = useState<string | null>(null);
  const phoneDigits = phone.replace(/\D/g, "");
  const canChooseMeals = name.trim().length > 0 && phoneDigits.length >= 7;

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
    const finalInvitedBy = invitedBy.trim();
    if (!finalInvitedBy) return toast.error("Please enter who invited you");

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
                    ? o.v === "yes"
                      ? "border-pink-500 bg-pink-500 text-white"
                      : "border-ink bg-ink text-cream"
                    : o.v === "yes"
                      ? "border-border bg-card hover:border-pink-500/40"
                      : "border-border bg-card hover:border-ink/40"
                }`}
              >
                <o.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{o.label}</span>
              </button>
            ))}
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

        {status === "yes" && attendanceMode === "in_person" && (
          <Card className="p-7 space-y-5">
            <div>
              <h2 className="font-display text-2xl">
                Pre-order your cultural meal
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cultural meals are in the twenty to thirty dollar range per meal. Each cuisine offers a beef and a chicken option, and gluten-free options are available. Click below to pre-order — we'll negotiate with the restaurant once we have a meal count total. You'll get the menu to confirm in the coming weeks and pay the restaurant directly.
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
                  setCuisineCounts({
                    ...cuisineCounts,
                    [cuisine.key]: Math.max(0, Math.min(20, n)),
                  });
                return (
                  <div
                    key={cuisine.key}
                    className="rounded-md border border-border bg-card p-4 space-y-3"
                  >
                    <h3 className="font-display text-2xl text-ink font-bold">{cuisine.label}</h3>
                    {cuisine.photos && (
                      <div className="grid grid-cols-3 gap-2">
                        {cuisine.photos.map((src, i) => (
                          <button
                            key={src}
                            type="button"
                            onClick={() => setLightbox(src)}
                            className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
                            aria-label={`${cuisine.label} meal photo ${i + 1}`}
                          >
                            <img src={src} alt={`${cuisine.label} meal ${i + 1}`} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    {cuisine.note && (
                      <p className="text-sm italic text-muted-foreground">{cuisine.note}</p>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-base font-display text-ink">{cuisine.label}</Label>
                      <div className="grid grid-cols-2 gap-2 w-36">
                        <button
                          type="button"

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
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-2xl bg-ink border-ink p-2">
          <DialogTitle className="sr-only">Meal photo</DialogTitle>
          {lightbox && <img src={lightbox} alt="Meal" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
