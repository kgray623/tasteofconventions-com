import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { clearDraftScope, useDraftState } from "@/hooks/use-draft-state";

export const Route = createFileRoute("/_authenticated/invitations/new")({
  head: () => ({ meta: [{ title: "New invitation" }] }),
  component: NewInvite,
});

const schema = z.object({
  event_id: z.string().uuid(),
  guest_name: z.string().trim().min(1, "Name required").max(100),
  guest_phone: z.string().trim().min(7, "Phone required").max(40),
  notes: z.string().max(500).optional().or(z.literal("")),
});

function NewInvite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const draftScope = `new-invitation:${user?.id ?? "guest"}`;
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventId, setEventId] = useDraftState(draftScope, "eventId", "");
  const [name, setName] = useDraftState(draftScope, "name", "");
  const [phone, setPhone] = useDraftState(draftScope, "phone", "");
  const [notes, setNotes] = useDraftState(draftScope, "notes", "");
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("events").select("id,title").order("starts_at").then(({ data }) => {
      setEvents(data ?? []);
      if (data?.[0]) setEventId(data[0].id);
    });
  }, []);

  // live duplicate check
  useEffect(() => {
    setWarning(null);
    if (!eventId) return;
    const t = setTimeout(async () => {
      const p = phone.replace(/\D/g, "");
      if (p.length < 7) return;
      const q = supabase.from("invitations").select("guest_name,guest_phone").eq("event_id", eventId).eq("guest_phone_normalized", p);
      const { data } = await q.limit(1);
      if (data && data.length > 0) {
        setWarning(`Possible duplicate: "${data[0].guest_name}" is already invited.`);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [phone, eventId]);

  const submit = async () => {
    const parsed = schema.safeParse({ event_id: eventId, guest_name: name, guest_phone: phone, notes });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("invitations").insert({
      event_id: eventId,
      host_id: user!.id,
      guest_name: name.trim(),
      guest_phone: phone.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    clearDraftScope(draftScope);
    toast.success("Invitation created");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <h1 className="font-display text-4xl mb-2">New invitation</h1>
      <p className="text-muted-foreground mb-8">We'll cross-check your guest against the full list to prevent duplicates.</p>

      <Card className="p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Event</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {events.map((e) => (<SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Guest name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
        </div>
        {warning && (
          <div className="flex items-start gap-2 text-sm bg-terracotta/10 border border-terracotta/30 text-terracotta rounded-md p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{warning}</span>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Seating preferences, plus-ones, etc." />
        </div>
        <Button onClick={submit} disabled={busy} className="bg-ink text-cream hover:bg-ink/90 w-full">
          {busy ? "Creating…" : "Create invitation"}
        </Button>
      </Card>
    </div>
  );
}
