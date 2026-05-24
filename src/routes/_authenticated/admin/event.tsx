import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/admin/event")({
  head: () => ({ meta: [{ title: "Edit Event — A Taste of Special Conventions" }] }),
  component: EditEventPage,
});

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
    </div>
  );
}
