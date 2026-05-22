import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { clearDraftScope, useDraftState } from "@/hooks/use-draft-state";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  talent: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

const MAX_BYTES = 200 * 1024 * 1024; // 200MB

export function EntertainmentSubmissionForm() {
  const draftScope = "entertainment-submission";
  const [name, setName] = useDraftState(draftScope, "name", "");
  const [email, setEmail] = useDraftState(draftScope, "email", "");
  const [phone, setPhone] = useDraftState(draftScope, "phone", "");
  const [talent, setTalent] = useDraftState(draftScope, "talent", "");
  const [notes, setNotes] = useDraftState(draftScope, "notes", "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      talent: String(fd.get("talent") ?? ""),
      notes: String(fd.get("notes") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    if (!file) {
      toast.error("Please choose a video file to upload");
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("File must be a video");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Video must be under 200MB");
      return;
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("entertainment-videos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase
        .from("entertainment_submissions")
        .insert({
          name: parsed.data.name,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          talent: parsed.data.talent || null,
          notes: parsed.data.notes || null,
          video_path: path,
        });
      if (insErr) throw insErr;

      clearDraftScope(draftScope);
      setDone(true);
      toast.success("Thank you! We'll reach out on this platform.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-sunset mx-auto mb-3" />
        <p className="font-display text-2xl text-ink">Submission received</p>
        <p className="text-sm text-muted-foreground mt-2">
          We'll reach out on this platform to discuss.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ent-name">Your name *</Label>
          <Input id="ent-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ent-talent">Your talent</Label>
          <Input id="ent-talent" name="talent" value={talent} onChange={(e) => setTalent(e.target.value)} maxLength={200} placeholder="e.g. Violin, Spoken word" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ent-email">Email</Label>
          <Input id="ent-email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" maxLength={255} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ent-phone">Phone</Label>
          <Input id="ent-phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" maxLength={40} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ent-notes">Anything we should know?</Label>
        <Textarea id="ent-notes" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ent-video">Upload your video * (max 200MB)</Label>
        <Input
          id="ent-video"
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        {file && (
          <p className="text-xs text-muted-foreground">
            {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="bg-gradient-sunset text-white hover:opacity-90 border-0 w-full"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
        ) : (
          <><Upload className="w-4 h-4 mr-2" /> Submit video</>
        )}
      </Button>
    </form>
  );
}
