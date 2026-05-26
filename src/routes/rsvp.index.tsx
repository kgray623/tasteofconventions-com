import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { submitPublicRsvp } from "@/lib/invitations.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clearDraftScope, useDraftState } from "@/hooks/use-draft-state";
import { Check, X, Minus, Plus, ArrowLeft, Users, Video } from "lucide-react";

export const Route = createFileRoute("/rsvp/")({
  head: () => ({ meta: [{ title: "RSVP" }] }),
  component: PreviewPage,
});

const ev = {
  title: "A Taste of Special Conventions",
};

function PreviewPage() {
  const { user, loading: authLoading } = useAuth();
  const draftScope = "rsvp-public";
  const [status, setStatus] = useDraftState<"yes" | "no">(draftScope, "status", "yes");
  const [attendanceMode, setAttendanceMode] = useDraftState<"in_person" | "zoom">(draftScope, "attendanceMode", "in_person");
  const [partySize, setPartySize] = useDraftState(draftScope, "partySize", 2);
  const [orderingFood, setOrderingFood] = useDraftState<"yes" | "no" | "">(draftScope, "orderingFood", "");
  const [name, setName] = useDraftState(draftScope, "name", "");
  const [phone, setPhone] = useDraftState(draftScope, "phone", "");
  const [invitedBy, setInvitedBy] = useDraftState(draftScope, "invitedBy", "");
  const [invitedByOther, setInvitedByOther] = useDraftState(draftScope, "invitedByOther", "");
  const [cuisineCounts, setCuisineCounts] = useDraftState<Record<string, number>>(draftScope, "cuisineCounts", {});
  const [inviters, setInviters] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.rpc("get_public_inviters")
      .then(({ data }) => setInviters(data ?? []));
  }, []);

  const save = useServerFn(submitPublicRsvp);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const handleSave = async () => {
    if (status !== "no" && !name.trim()) return toast.error("Please enter your full name");
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 7) return toast.error("Please enter your mobile number");
    if (status === "yes" && attendanceMode === "in_person" && orderingFood === "") {
      return toast.error("Please tell us whether you'll be ordering food");
    }
    setSaving(true);
    try {
      const orderingFoodBool = status === "yes" && attendanceMode === "in_person" ? orderingFood === "yes" : null;
      const selections = orderingFoodBool
        ? Object.entries(cuisineCounts)
            .filter(([, qty]) => qty > 0)
            .map(([cuisine, qty]) => ({ cuisine, qty }))
        : [];
      if (orderingFoodBool && selections.length === 0) {
        setSaving(false);
        return toast.error("Please pick at least one cuisine and meal count.");
      }
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
      clearDraftScope(draftScope);
      toast.success("RSVP saved — thank you!");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save RSVP");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (user) {
    return <Navigate to="/my-rsvp" replace />;
  }

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
          <Button onClick={handleSave} disabled={saving} className="bg-ink text-cream hover:bg-ink/90 w-full">{saving ? "Saving…" : "Save RSVP"}</Button>
          {saved && (
            <div className="rounded-md border border-border bg-cream/40 p-4 text-sm text-ink space-y-2">
              <p className="font-medium">Your RSVP is saved.</p>
              <p className="text-muted-foreground">We'll be in touch with more details soon.</p>
            </div>
          )}
        </Card>

        {status === "yes" && attendanceMode === "in_person" && (
          <Card className="p-7 space-y-5">
            <div>
              <h2 className="font-display text-2xl">Pre-order from your cultural choice restaurant</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Meals run about $20–$25. Pick any combination — one cuisine, two, or all three. We're just gathering a headcount per restaurant for now.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Will you be ordering?</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "yes", label: "Ordering food" },
                  { v: "no", label: "Not ordering food" },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setOrderingFood(o.v as "yes" | "no")}
                    className={`p-3 rounded-md border-2 transition text-sm font-medium ${
                      orderingFood === o.v ? "border-terracotta bg-terracotta text-cream" : "border-border bg-card hover:border-terracotta/40"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {orderingFood === "yes" && (
              <div className="space-y-2">
                <Label>How many meals from each cuisine?</Label>
                <p className="text-xs text-muted-foreground">Pick any combination — one cuisine, two, or all three. Quantities are total meals per cuisine.</p>
                <div className="divide-y divide-border rounded-md border border-border">
                  {["Myanmar / Burmese", "African", "Indonesian"].map((cuisine) => {
                    const qty = cuisineCounts[cuisine] ?? 0;
                    const setQty = (n: number) =>
                      setCuisineCounts({ ...cuisineCounts, [cuisine]: Math.max(0, Math.min(20, n)) });
                    return (
                      <div key={cuisine} className="flex items-center justify-between gap-3 p-3">
                        <span className="font-medium">{cuisine}</span>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" onClick={() => setQty(qty - 1)} aria-label={`Fewer ${cuisine}`}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-display text-lg">{qty}</span>
                          <Button size="icon" variant="outline" onClick={() => setQty(qty + 1)} aria-label={`More ${cuisine}`}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground italic">Menu details will follow once we negotiate with each restaurant.</p>
              </div>
            )}
            {orderingFood === "" && (
              <p className="text-xs text-muted-foreground italic">Tap "Ordering food" above to pick how many meals from Myanmar/Burmese, African, or Indonesian.</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
