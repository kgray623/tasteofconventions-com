import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRoles } from "@/hooks/use-roles";
import { getMyInvitation } from "@/lib/invitations.functions";
import { Calendar, MapPin, Users, Check, X, UtensilsCrossed } from "lucide-react";
import { withTimeout } from "@/lib/async-safety";

export const Route = createFileRoute("/_authenticated/admin/event")({
  head: () => ({ meta: [{ title: "Edit Event — A Taste of Special Conventions" }] }),
  component: EditEventPage,
});

function MyRsvpCard() {
  const fetchMine = useServerFn(getMyInvitation);
  const [state, setState] = useState<"loading" | "none" | "ready">("loading");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await withTimeout(fetchMine(), 10000);
        if (cancelled) return;
        if (r?.invitation) { setData(r); setState("ready"); } else setState("none");
      } catch { if (!cancelled) setState("none"); }
    })();
    return () => { cancelled = true; };
  }, [fetchMine]);

  if (state === "loading") {
    return <Card className="p-6 text-sm text-muted-foreground">Loading your RSVP…</Card>;
  }
  if (state === "none" || !data?.invitation) {
    return (
      <Card className="p-6 space-y-3">
        <h2 className="font-display text-2xl">Your RSVP</h2>
        <p className="text-sm text-muted-foreground">No invitation is linked to your account email yet. Once an inviter adds you (or you RSVP with the same email), your details will appear here.</p>
        <Link to="/rsvp"><Button variant="outline" size="sm">Open RSVP page</Button></Link>
      </Card>
    );
  }
  const invitation = data.invitation;
  const ev = invitation.events;
  const rsvp = data.rsvp;
  const order = data.order;
  const rsvpDone = !!rsvp?.responded_at;
  const rsvpYes = rsvp?.status === "yes";
  const orderItems: Array<{ name?: string; quantity?: number; price?: number }> = Array.isArray(order?.items) ? order.items : [];
  const orderDone = orderItems.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Your RSVP</p>
        <h2 className="font-display text-2xl mt-1">Hello, {invitation.guest_name}</h2>
        <p className="text-sm text-muted-foreground mt-1">Everything from your invitation, in one place.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`rounded-lg border-2 p-4 flex items-center gap-3 ${rsvpDone ? (rsvpYes ? "border-ink bg-ink text-cream" : "border-ink") : "border-dashed"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${rsvpDone ? (rsvpYes ? "bg-cream text-ink" : "bg-ink text-cream") : "bg-muted text-muted-foreground"}`}>
            {rsvpDone ? (rsvpYes ? <Check className="w-5 h-5" strokeWidth={3} /> : <X className="w-5 h-5" strokeWidth={3} />) : <span>?</span>}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-80">RSVP</p>
            <p className="font-display text-xl leading-tight">{rsvpDone ? (rsvpYes ? "RSVP'd" : "Declined") : "Not yet"}</p>
            {rsvpDone && rsvpYes && (
              <p className="text-xs opacity-90">{rsvp?.attendance_mode === "zoom" ? "Virtual (Zoom)" : `In person · party of ${rsvp?.party_size ?? 1}`}</p>
            )}
          </div>
        </div>
        <div className={`rounded-lg border-2 p-4 flex items-center gap-3 ${orderDone ? "border-terracotta bg-terracotta text-cream" : "border-dashed"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${orderDone ? "bg-cream text-terracotta" : "bg-muted text-muted-foreground"}`}>
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-80">Food pre-order</p>
            <p className="font-display text-xl leading-tight">{orderDone ? "Ordered" : "No order yet"}</p>
            {orderDone && (
              <p className="text-xs opacity-90">
                {orderItems.reduce((s, i) => s + (i.quantity ?? 0), 0)} item{orderItems.length === 1 ? "" : "s"} · ${Number(order?.total ?? 0).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
      {orderDone && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">Your food choices</h3>
            <span className="font-display text-terracotta">${Number(order?.total ?? 0).toFixed(2)}</span>
          </div>
          <ul className="divide-y divide-border">
            {orderItems.map((it, idx) => (
              <li key={idx} className="py-2 flex items-center gap-3 text-sm">
                <span className="font-display w-8 text-terracotta">{it.quantity ?? 1}×</span>
                <span className="flex-1">{it.name ?? "Item"}</span>
                <span className="text-muted-foreground">${(Number(it.price ?? 0) * Number(it.quantity ?? 1)).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          {order?.notes && <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">Note: {order.notes}</p>}
        </Card>
      )}
      <Card className="p-5 space-y-4">
        <div className="grid gap-2 text-sm">
          <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" />{new Date(ev.starts_at).toLocaleString()}</span>
          {ev.location && <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" />{ev.location}</span>}
          <span className="inline-flex items-center gap-2"><Users className="w-4 h-4 text-gold" />{rsvp?.status === "no" ? "Declined" : rsvp?.attendance_mode === "zoom" ? "Attending virtually (Zoom)" : `Attending in person · party of ${rsvp?.party_size ?? 1}${rsvp?.ordering_food === true ? " · ordering food" : rsvp?.ordering_food === false ? " · not ordering food" : ""}`}</span>
        </div>
        <div className="rounded-md border border-border bg-cream/40 p-4 text-sm space-y-1">
          <p><strong>Name:</strong> {invitation.guest_name}</p>
          {invitation.guest_email && <p><strong>Email:</strong> {invitation.guest_email}</p>}
          {invitation.guest_phone && <p><strong>Phone:</strong> {invitation.guest_phone}</p>}
          {rsvp?.invited_by && <p><strong>Invited by:</strong> {rsvp.invited_by}</p>}
          {rsvp?.dietary_notes && <p><strong>Dietary notes:</strong> {rsvp.dietary_notes}</p>}
        </div>
        <Link to="/rsvp/$token" params={{ token: invitation.rsvp_token }}>
          <Button className="bg-ink text-cream hover:bg-ink/90 w-full">{orderDone ? "Update RSVP or order" : "Update RSVP or place a pre-order"}</Button>
        </Link>
      </Card>
    </div>
  );
}


function EditEventPage() {
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(""); // local datetime string
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [virtualLink, setVirtualLink] = useState("");
  const [initial, setInitial] = useState<string>("");

  const current = JSON.stringify({ title, description, startsAt, endsAt, location, virtualLink });
  const dirty = initial !== "" && current !== initial;

  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      return !confirm("You have unsaved event changes. Leave without saving?");
    },
    enableBeforeUnload: dirty,
  });

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,starts_at,ends_at,location,virtual_link")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        const t = data.title ?? "";
        const d = data.description ?? "";
        const s = toLocalInput(data.starts_at);
        const e = toLocalInput(data.ends_at);
        const l = data.location ?? "";
        const v = data.virtual_link ?? "";
        setId(data.id);
        setTitle(t); setDescription(d); setStartsAt(s); setEndsAt(e); setLocation(l); setVirtualLink(v);
        setInitial(JSON.stringify({ title: t, description: d, startsAt: s, endsAt: e, location: l, virtualLink: v }));
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!title.trim()) return toast.error("Title is required");
    if (!startsAt) return toast.error("Start date/time is required");
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      location: location.trim() || null,
      virtual_link: virtualLink.trim() || null,
    };
    const { error } = await supabase.from("events").update(payload).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setInitial(current);
    toast.success("Event updated. Guest screens and emails will now show the new details.");
  };

  if (loading || rolesLoading) return <div className="text-muted-foreground">Loading event…</div>;
  if (!id) return <div className="text-muted-foreground">No event found.</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Event details</p>
        <h1 className="font-display text-3xl mt-1">{isAdmin ? "Edit event" : "Event details"}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {isAdmin
            ? "These details show on every invitation, RSVP page, and confirmation email."
            : "These are the current event details for team coordination."}
        </p>
      </div>
      <Card className="p-6 space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isAdmin} />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={!isAdmin} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="starts">Starts at</Label>
            <Input id="starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label htmlFor="ends">Ends at (optional)</Label>
            <Input id="ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} disabled={!isAdmin} />
          </div>
        </div>
        <div>
          <Label htmlFor="loc">Location / address</Label>
          <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 123 Main St, Sacramento, CA" disabled={!isAdmin} />
        </div>
        <div>
          <Label htmlFor="vlink">Virtual link (optional)</Label>
          <Input id="vlink" value={virtualLink} onChange={(e) => setVirtualLink(e.target.value)} placeholder="https://…" disabled={!isAdmin} />
        </div>
        {isAdmin && <div className="flex items-center gap-3 pt-2">
          <Button onClick={save} disabled={saving || !dirty} className="bg-ink text-cream hover:bg-ink/90">
            {saving ? "Saving…" : dirty ? "Save event" : "Saved"}
          </Button>
          {dirty && (

            <span className="text-xs text-terracotta">Unsaved changes — click Save event.</span>
          )}
        </div>}
      </Card>
      <MyRsvpCard />
    </div>
  );
}

