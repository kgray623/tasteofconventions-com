import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/invitation")({
  head: () => ({ meta: [{ title: "Invitation — Admin" }] }),
  component: InvitationAdminPage,
});

type Stop = { country: string; when: string; note: string; restaurant: boolean };

type Content = {
  id: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_title_emphasis: string;
  hero_title_suffix: string;
  hero_tagline: string;
  hero_intro: string;
  video_url: string | null;
  itinerary: Stop[];
  datetime_heading: string;
  datetime_body: string;
  location_name: string;
  location_subtitle: string;
  location_body: string;
  dress_body: string;
  gifts_body: string;
};

function InvitationAdminPage() {
  const [c, setC] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("invitation_content")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        const row = data as unknown as Content;
        setC({ ...row, itinerary: Array.isArray(row.itinerary) ? row.itinerary : [] });
      }
      setLoading(false);
    })();
  }, []);

  const update = <K extends keyof Content>(k: K, v: Content[K]) =>
    setC((prev) => (prev ? { ...prev, [k]: v } : prev));

  const updateStop = (i: number, patch: Partial<Stop>) =>
    setC((prev) => {
      if (!prev) return prev;
      const next = [...prev.itinerary];
      next[i] = { ...next[i], ...patch };
      return { ...prev, itinerary: next };
    });

  const addStop = () =>
    setC((prev) =>
      prev
        ? { ...prev, itinerary: [...prev.itinerary, { country: "", when: "", note: "", restaurant: false }] }
        : prev,
    );

  const removeStop = (i: number) =>
    setC((prev) =>
      prev ? { ...prev, itinerary: prev.itinerary.filter((_, idx) => idx !== i) } : prev,
    );

  const save = async () => {
    if (!c) return;
    setSaving(true);
    const { id, ...rest } = c;
    const { error } = await supabase
      .from("invitation_content")
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Invitation updated.");
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!c) return <p className="text-muted-foreground">No content row found.</p>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Invitation page content</h2>
          <p className="text-sm text-muted-foreground">Edits go live on the public invitation page.</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-ink text-cream hover:bg-ink/90">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-medium">Hero</h3>
        <Field label="Eyebrow"><Input value={c.hero_eyebrow} onChange={(e) => update("hero_eyebrow", e.target.value)} /></Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Title (start)"><Input value={c.hero_title} onChange={(e) => update("hero_title", e.target.value)} /></Field>
          <Field label="Title (emphasis)"><Input value={c.hero_title_emphasis} onChange={(e) => update("hero_title_emphasis", e.target.value)} /></Field>
          <Field label="Title (suffix)"><Input value={c.hero_title_suffix} onChange={(e) => update("hero_title_suffix", e.target.value)} /></Field>
        </div>
        <Field label="Tagline"><Input value={c.hero_tagline} onChange={(e) => update("hero_tagline", e.target.value)} /></Field>
        <Field label="Intro paragraph"><Textarea rows={4} value={c.hero_intro} onChange={(e) => update("hero_intro", e.target.value)} /></Field>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-medium">Invitation video</h3>
        <Field label="Video embed URL (leave empty for placeholder)">
          <Input
            placeholder="https://drive.google.com/file/d/…/preview or https://www.youtube.com/embed/…"
            value={c.video_url ?? ""}
            onChange={(e) => update("video_url", e.target.value || null)}
          />
        </Field>
        <p className="text-xs text-muted-foreground">Empty shows a video placeholder graphic.</p>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Itinerary (Conventions & Countries)</h3>
          <Button size="sm" variant="outline" onClick={addStop}><Plus className="w-4 h-4 mr-1" /> Add stop</Button>
        </div>
        {c.itinerary.length === 0 && <p className="text-sm text-muted-foreground">No stops yet.</p>}
        {c.itinerary.map((s, i) => (
          <div key={i} className="border border-border rounded-lg p-4 space-y-3 bg-background">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Stop #{i + 1}</p>
              <Button size="sm" variant="ghost" onClick={() => removeStop(i)} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Country"><Input value={s.country} onChange={(e) => updateStop(i, { country: e.target.value })} /></Field>
              <Field label="When (e.g. Convention · 2014)"><Input value={s.when} onChange={(e) => updateStop(i, { when: e.target.value })} /></Field>
            </div>
            <Field label="Note"><Textarea rows={2} value={s.note} onChange={(e) => updateStop(i, { note: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={s.restaurant} onCheckedChange={(v) => updateStop(i, { restaurant: v })} />
              Show "Pre-order the cuisine" link
            </label>
          </div>
        ))}
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-medium">Date & Time</h3>
        <Field label="Heading"><Input value={c.datetime_heading} onChange={(e) => update("datetime_heading", e.target.value)} /></Field>
        <Field label="Body"><Textarea rows={2} value={c.datetime_body} onChange={(e) => update("datetime_body", e.target.value)} /></Field>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-medium">Location</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Venue name"><Input value={c.location_name} onChange={(e) => update("location_name", e.target.value)} /></Field>
          <Field label="Subtitle (city/state)"><Input value={c.location_subtitle} onChange={(e) => update("location_subtitle", e.target.value)} /></Field>
        </div>
        <Field label="Body"><Textarea rows={3} value={c.location_body} onChange={(e) => update("location_body", e.target.value)} /></Field>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-medium">Dress Code</h3>
        <Field label="Body"><Textarea rows={4} value={c.dress_body} onChange={(e) => update("dress_body", e.target.value)} /></Field>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-medium">Gift Exchanges</h3>
        <Field label="Body"><Textarea rows={4} value={c.gifts_body} onChange={(e) => update("gifts_body", e.target.value)} /></Field>
      </Card>

      <div className="pb-12">
        <Button onClick={save} disabled={saving} className="bg-ink text-cream hover:bg-ink/90">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
