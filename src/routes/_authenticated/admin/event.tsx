import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/event")({
  head: () => ({ meta: [{ title: "Edit Event — A Taste of Special Conventions" }] }),
  component: EditEventPage,
});

function EditEventPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(""); // local datetime string
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [virtualLink, setVirtualLink] = useState("");

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
        setId(data.id);
        setTitle(data.title ?? "");
        setDescription(data.description ?? "");
        setStartsAt(toLocalInput(data.starts_at));
        setEndsAt(toLocalInput(data.ends_at));
        setLocation(data.location ?? "");
        setVirtualLink(data.virtual_link ?? "");
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
    toast.success("Event updated. Guest screens and emails will now show the new details.");
  };

  if (loading) return <div className="text-muted-foreground">Loading event…</div>;
  if (!id) return <div className="text-muted-foreground">No event found.</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Event details</p>
        <h1 className="font-display text-3xl mt-1">Edit event</h1>
        <p className="text-sm text-muted-foreground mt-2">
          These details show on every invitation, RSVP page, and confirmation email.
        </p>
      </div>
      <Card className="p-6 space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="starts">Starts at</Label>
            <Input id="starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ends">Ends at (optional)</Label>
            <Input id="ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="loc">Location / address</Label>
          <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 123 Main St, Sacramento, CA" />
        </div>
        <div>
          <Label htmlFor="vlink">Virtual link (optional)</Label>
          <Input id="vlink" value={virtualLink} onChange={(e) => setVirtualLink(e.target.value)} placeholder="https://…" />
        </div>
        <Button onClick={save} disabled={saving} className="bg-ink text-cream hover:bg-ink/90">
          {saving ? "Saving…" : "Save event"}
        </Button>
      </Card>
    </div>
  );
}
