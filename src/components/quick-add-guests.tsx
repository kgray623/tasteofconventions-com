import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { addGuests } from "@/lib/guest-add.functions";

type ParsedLine = { name: string; phone: string | null };

const PHONE_RE =
  /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\b\d{10,15}\b/;

/**
 * Parse pasted lines like:
 *   Eileen and Blane Annoye, (402) 850-8966
 *   Jane Doe 402-555-1212
 * One guest per line: everything that is not the phone number is the name.
 */
export function parsePastedGuests(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const phoneMatch = line.match(PHONE_RE);
    const phone = phoneMatch?.[0]?.trim() ?? null;
    const name = line
      .replace(PHONE_RE, " ")
      .replace(/[,;|\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!name || !/[a-zA-Z]/.test(name)) continue;
    out.push({ name, phone });
  }
  return out;
}

/**
 * Compact "add guests fast" card for the committee workspace. It uses the same
 * addGuests server function as the full Add guests page, so referral credit and
 * duplicate protection behave identically.
 */
export function QuickAddGuests({ inviterId }: { inviterId: string | null }) {
  const [text, setText] = useState("");
  const [zoom, setZoom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const addGuestsFn = useServerFn(addGuests);

  const parsed = useMemo(() => parsePastedGuests(text), [text]);

  const submit = async () => {
    if (parsed.length === 0) {
      toast.error("Add at least one line with a name and phone number.");
      return;
    }
    setBusy(true);
    try {
      const { data: events, error } = await supabase
        .from("events")
        .select("id")
        .order("starts_at")
        .limit(1);
      if (error) throw error;
      const eventId = events?.[0]?.id;
      if (!eventId) throw new Error("No event found.");

      const { results } = await addGuestsFn({
        data: {
          eventId,
          inviterId: inviterId || null,
          guests: parsed.map((p) => ({
            name: p.name,
            phone: p.phone,
            notes: zoom ? "Plans to attend by Zoom" : null,
          })),
        },
      });
      const ok = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);
      if (ok.length > 0) {
        setAdded((prev) => [...ok.map((r) => r.name), ...prev]);
        setText("");
        toast.success(`Added ${ok.length} guest${ok.length === 1 ? "" : "s"}`);
      }
      for (const f of failed) {
        toast.warning(`${f.name} was not added`, { description: f.error?.message ?? "" });
      }
    } catch (e) {
      console.error("[quick-add-guests] failed", e);
      toast.error("Couldn't add those guests", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 space-y-3 border-terracotta/50 bg-terracotta/5">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-terracotta" />
        <h2 className="text-lg font-semibold">Add guests fast</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        One guest per line — name and phone number. Example:{" "}
        <span className="whitespace-nowrap">Eileen and Blane Annoye, 402-850-8966</span>
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={"Eileen and Blane Annoye, 402-850-8966\nJane Doe 402-555-1212"}
        aria-label="Paste guest names and phone numbers"
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={zoom} onCheckedChange={(v) => setZoom(v === true)} />
        They plan to attend by Zoom (added as a note)
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => void submit()}
          disabled={busy || parsed.length === 0}
          className="bg-terracotta text-cream hover:bg-terracotta/90"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" /> Add{" "}
              {parsed.length > 0 ? `${parsed.length} ` : ""}guest
              {parsed.length === 1 ? "" : "s"}
            </>
          )}
        </Button>
        <Link
          to="/admin/upload"
          search={{ view: "committee" }}
          className="text-sm underline text-muted-foreground hover:text-ink"
        >
          Screenshots or a long list? Open the full Add guests page
        </Link>
      </div>
      {added.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Added just now: <span className="text-ink">{added.join(", ")}</span>
        </p>
      )}
    </Card>
  );
}
