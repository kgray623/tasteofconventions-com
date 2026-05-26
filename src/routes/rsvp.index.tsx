import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getPublicRsvpByPhone, submitPublicRsvp } from "@/lib/invitations.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [attendanceMode, setAttendanceMode] = useDraftState<"in_person" | "zoom">(draftScope, "attendanceMode", "in_person");
  const [partySize, setPartySize] = useDraftState(draftScope, "partySize", 2);
  const [name, setName] = useDraftState(draftScope, "name", "");
  const [phone, setPhone] = useDraftState(draftScope, "phone", "");
  const [invitedBy, setInvitedBy] = useDraftState(draftScope, "invitedBy", "");
  const [invitedByOther, setInvitedByOther] = useDraftState(draftScope, "invitedByOther", "");
  const [cuisineCounts, setCuisineCounts] = useDraftState<Record<string, number>>(draftScope, "cuisineCounts", {});
  const [submittedAt, setSubmittedAt] = useDraftState<string | null>(draftScope, "submittedAt", null);
  const [inviters, setInviters] = useState<{ id: string; name: string }[]>([]);
  const cuisines = ["Myanmar", "African", "Indonesian"];
  const phoneDigits = phone.replace(/\D/g, "");
  const canChooseMeals = name.trim().length > 0 && phoneDigits.length >= 7;

  useEffect(() => {
    supabase.rpc("get_public_inviters")
      .then(({ data }) => setInviters(data ?? []));
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
        ? result.preorder.selections.filter(isSelection).reduce<Record<string, number>>((acc, item) => {
            acc[item.cuisine] = item.qty;
            return acc;
          }, {})
        : {};
      setCuisineCounts(restoredCounts);
      setSubmittedAt(result.rsvp.responded_at ?? new Date().toISOString());
      setSaved(false);
      toast.success("Your RSVP was restored.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not restore RSVP");
    } finally {
      setRestoring(false);
    }
  };

  const handleSave = async () => {
    if (status !== "no" && !name.trim()) return toast.error("Please enter your full name");
    if (phoneDigits.length < 7) return toast.error("Please enter your mobile number");
    setSaving(true);
    try {
      const selections = status === "yes" && attendanceMode === "in_person"
        ? Object.entries(cuisineCounts)
            .filter(([, qty]) => qty > 0)
            .map(([cuisine, qty]) => ({ cuisine, qty }))
        : [];
      if (selections.length > 0 && !canChooseMeals) {
        return toast.error("Please enter your full name and mobile number before choosing meals");
      }
      const orderingFoodBool = status === "yes" && attendanceMode === "in_person" ? selections.length > 0 : null;
      await save({ data: {
        guest_name: name.trim() || "Guest",
        guest_email: null,
        guest_phone: phone.trim() || null,
        password: phoneDigits,
        status,
        party_size: partySize,
        attendance_mode: attendanceMode,
        ordering_food: orderingFoodBool,
        invited_by: (invitedBy === "__other__" ? invitedByOther.trim() : invitedBy) || null,
        cuisine_selections: selections,
      }});
      setSaved(true);
      setSubmittedAt(new Date().toISOString());
      toast.success("RSVP saved — thank you!");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save RSVP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-ink">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to invitation
        </Link>
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">You're invited</p>
          <h1 className="font-display text-5xl mt-3 text-ink">{ev.title}</h1>
        </div>

        <Card className="p-5 space-y-3 border-terracotta/30 bg-card">
          <div>
            <h2 className="font-display text-2xl">Already RSVP'd?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your mobile number below, then restore your RSVP before updating meal counts.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" />
            <Button type="button" variant="outline" onClick={restoreByPhone} disabled={restoring || phoneDigits.length < 7} className="sm:w-44">
              {restoring ? "Restoring…" : "Restore RSVP"}
            </Button>
          </div>
        </Card>

        <Card className="p-7 space-y-5">
          <h2 className="font-display text-2xl">Will you be joining us?</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "yes", icon: Check, label: "Attending" },
              { v: "no", icon: X, label: "Decline" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setStatus(o.v as any)}
                className={`p-4 rounded-md border-2 transition flex flex-col items-center gap-2 ${
                  status === o.v ? "border-ink bg-ink text-cream" : "border-border bg-card hover:border-ink/40"
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
                    { v: "in_person", icon: Users, label: "In-person Attendance", sub: "Limited seating" },
                    { v: "zoom", icon: Video, label: "Virtual Attendance", sub: "Join on Zoom" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setAttendanceMode(o.v as "in_person" | "zoom")}
                      className={`p-4 rounded-md border-2 transition flex flex-col items-center gap-1.5 ${
                        attendanceMode === o.v ? "border-ink bg-ink text-cream" : "border-border bg-card hover:border-ink/40"
                      }`}
                    >
                      <o.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{o.label}</span>
                      <span className={`text-[10px] uppercase tracking-widest ${attendanceMode === o.v ? "text-cream/70" : "text-muted-foreground"}`}>{o.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              {attendanceMode === "in_person" && (
                <div className="space-y-1.5">
                  <Label>Party size (including you)</Label>
                  <div className="flex items-center gap-3">
                    <Button size="icon" variant="outline" onClick={() => setPartySize(Math.max(1, partySize - 1))}><Minus className="w-4 h-4" /></Button>
                    <span className="font-display text-2xl w-10 text-center">{partySize}</span>
                    <Button size="icon" variant="outline" onClick={() => setPartySize(Math.min(20, partySize + 1))}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Seating is limited — please count everyone in your group.</p>
                </div>
              )}
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground pt-3">So we can stay in touch</p>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Mobile number</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
                </div>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="invited-by">Invited by</Label>
            <Select value={invitedBy || undefined} onValueChange={setInvitedBy}>
              <SelectTrigger id="invited-by"><SelectValue placeholder="Select who invited you" /></SelectTrigger>
              <SelectContent>
                {inviters.map((i) => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
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
              <h2 className="font-display text-2xl">Pre-order from your cultural choice restaurant</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Meals run about $20–$25. Enter your full name and mobile number above, then choose yes or no for each cuisine and enter the number of dishes you may want.
              </p>
              {!canChooseMeals && (
                <p className="text-sm text-terracotta mt-2">
                  Meal choices stay locked until we know who to contact: full name and mobile number are required.
                </p>
              )}
            </div>
            <div className="space-y-3">
              {cuisines.map((cuisine) => {
                const qty = cuisineCounts[cuisine] ?? 0;
                const selected = qty > 0;
                const setQty = (n: number) =>
                  canChooseMeals
                    ? setCuisineCounts({ ...cuisineCounts, [cuisine]: Math.max(0, Math.min(20, n)) })
                    : toast.error("Please enter your full name and mobile number before choosing meals");
                return (
                  <div key={cuisine} className={`rounded-md border border-border bg-card p-4 space-y-3 ${canChooseMeals ? "" : "opacity-60"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-base font-display text-ink">{cuisine}</Label>
                      <div className="grid grid-cols-2 gap-2 w-36">
                        <button
                          type="button"
                          disabled={!canChooseMeals}
                          onClick={() => setQty(qty > 0 ? qty : 1)}
                          className={`rounded-md border-2 px-3 py-2 text-sm font-medium transition ${
                            selected ? "border-terracotta bg-terracotta text-cream" : "border-border bg-card hover:border-terracotta/40"
                          } disabled:cursor-not-allowed`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          disabled={!canChooseMeals}
                          onClick={() => setQty(0)}
                          className={`rounded-md border-2 px-3 py-2 text-sm font-medium transition ${
                            !selected ? "border-ink bg-ink text-cream" : "border-border bg-card hover:border-ink/40"
                          } disabled:cursor-not-allowed`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Number of dishes</span>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" disabled={!canChooseMeals} onClick={() => setQty(qty - 1)} aria-label={`Fewer ${cuisine} dishes`}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-10 text-center font-display text-2xl text-ink">{qty}</span>
                        <Button size="icon" variant="outline" disabled={!canChooseMeals} onClick={() => setQty(qty + 1)} aria-label={`More ${cuisine} dishes`}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground italic">More details coming soon.</p>
            </div>
          </Card>
        )}

        <Card className="p-5 space-y-4 border-terracotta/30 bg-card">
          <div className="space-y-1">
            <h2 className="font-display text-2xl">Submit your RSVP</h2>
            <p className="text-sm text-muted-foreground">
              This saves your attendance and any Myanmar, African, or Indonesian dish counts.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-ink text-cream hover:bg-ink/90 w-full h-12 text-base">
            {saving ? "Submitting…" : "Submit RSVP"}
          </Button>
          {saved && (
            <div className="rounded-md border border-border bg-cream/40 p-4 text-sm text-ink space-y-2">
              <p className="font-medium">Your RSVP is saved.</p>
              <p className="text-muted-foreground">Your details will remain on this device if the page refreshes, so you can come back and update meal counts.</p>
            </div>
          )}
          {!saved && hasSubmitted && (
            <div className="rounded-md border border-border bg-cream/40 p-4 text-sm text-ink space-y-2">
              <p className="font-medium">Your previous RSVP is still here.</p>
              <p className="text-muted-foreground">Review or update your details and submit again if anything changed.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
