import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ImagePlus, ListChecks, Download, CheckCircle2 } from "lucide-react";
import { getErrorMessage, withTimeout } from "@/lib/async-safety";
import { extractContactsFromImages } from "@/lib/extract-contacts.functions";
import {
  reconcileReferralList,
  commitReferralReconciliation,
  type ReconcileResult,
} from "@/lib/referral-reconcile.functions";
import { formatPhoneUS } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/admin/reconcile")({
  head: () => ({
    meta: [
      { title: "Reconcile a committee list — Admin" },
      {
        name: "description",
        content:
          "Match a committee member's submitted guest list against the system line by line: credited, duplicate, unowned, or missing.",
      },
      { property: "og:title", content: "Reconcile a committee list — Admin" },
      {
        property: "og:description",
        content: "Line-by-line referral reconciliation for committee guest lists.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReconcilePage,
});

type InviterOption = { id: string; name: string };
type Line = { name: string; phone: string };

const parseLines = (raw: string): Line[] =>
  raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const phoneMatch = line.match(/(\+?\d[\d\s().-]{6,}\d)/);
      const phone = phoneMatch ? phoneMatch[1].trim() : "";
      const name = (phone ? line.replace(phone, "") : line)
        .replace(/[\t,;|]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/^[-–•*\d.)\s]+/, "")
        .trim();
      return { name, phone };
    })
    .filter((l) => l.name || l.phone);

const outcomeStyles: Record<string, { label: string; className: string }> = {
  owned: { label: "Credited", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  duplicate: { label: "Duplicate", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  unowned: { label: "No owner", className: "bg-sky-500/15 text-sky-700 border-sky-500/30" },
  missing: { label: "Missing", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

function ReconcilePage() {
  const [inviters, setInviters] = useState<InviterOption[]>([]);
  const [inviterId, setInviterId] = useState("");
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const runReconcile = useServerFn(reconcileReferralList);
  const runCommit = useServerFn(commitReferralReconciliation);
  const runExtract = useServerFn(extractContactsFromImages);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data, error } = await supabase
        .from("inviters")
        .select("id,name")
        .eq("active", true)
        .order("name");
      if (!alive) return;
      if (error) {
        toast.error("Couldn't load the committee list");
        return;
      }
      setInviters((data ?? []) as InviterOption[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const lines = useMemo(() => parseLines(raw), [raw]);

  const handleImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setExtracting(true);
    try {
      const images = await Promise.all(
        Array.from(files)
          .slice(0, 10)
          .map(
            (file) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
                reader.readAsDataURL(file);
              }),
          ),
      );
      const res = await withTimeout(runExtract({ data: { images } }), 120_000, "reading the images");
      const found = res.contacts ?? [];
      if (found.length === 0) {
        toast.error("No names were found in those images");
        return;
      }
      setRaw((prev) => {
        const block = found.map((c) => `${c.name} ${c.phone}`.trim()).join("\n");
        return prev.trim() ? `${prev.trim()}\n${block}` : block;
      });
      toast.success(`Read ${found.length} line${found.length === 1 ? "" : "s"} from the images`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleReconcile = async () => {
    if (!inviterId) {
      toast.error("Pick a committee member first");
      return;
    }
    if (lines.length === 0) {
      toast.error("Paste the list or upload the screenshots first");
      return;
    }
    setBusy(true);
    try {
      const res = await withTimeout(
        runReconcile({ data: { inviterId, lines } }),
        90_000,
        "matching the list",
      );
      setResult(res);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;
    setApplying(true);
    try {
      const res = await withTimeout(
        runCommit({
          data: {
            inviterId: result.inviterId,
            eventId: result.eventId,
            claimUnownedIds: result.rows
              .filter((r) => r.outcome === "unowned" && r.invitationId)
              .map((r) => r.invitationId as string),
            addMissing: result.rows
              .filter((r) => r.outcome === "missing")
              .map((r) => ({ name: r.name, phone: r.phone })),
            recordDuplicates: result.rows
              .filter((r) => r.outcome === "duplicate" && r.invitationId)
              .map((r) => ({ invitationId: r.invitationId as string, ownerInviterId: null })),
          },
        }),
        120_000,
        "applying the reconciliation",
      );
      toast.success(
        `Added ${res.added}, claimed ${res.claimed}, duplicates recorded ${res.duplicatesRecorded}`,
      );
      if (res.failures.length > 0) {
        toast.error(`${res.failures.length} line(s) failed — see the list below`);
      }
      await handleReconcile();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setApplying(false);
    }
  };

  const downloadCsv = () => {
    if (!result) return;
    const head = [
      "line",
      "submitted_name",
      "submitted_phone",
      "outcome",
      "matched_by",
      "matched_name",
      "matched_phone",
      "credited_to",
      "first_loaded_at",
      "rsvp_status",
      "people",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = result.rows.map((r) =>
      [
        r.index + 1,
        r.name,
        r.phone,
        r.outcome,
        r.matchedBy ?? "",
        r.matchedName ?? "",
        r.matchedPhone ?? "",
        r.outcome === "owned" ? result.inviterName : (r.ownerName ?? ""),
        r.ownerCreatedAt ?? "",
        r.rsvpStatus ?? "",
        r.people,
      ]
        .map(esc)
        .join(","),
    );
    const blob = new Blob([[head.map(esc).join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.inviterName.replace(/\s+/g, "-").toLowerCase()}-referral-reconciliation.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = result?.summary;

  return (
    <div className="space-y-4 p-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <ListChecks className="h-5 w-5 mt-0.5 text-primary" />
          <div>
            <h1 className="font-semibold leading-tight">Reconcile a committee list</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload the screenshots (or paste the lines) exactly as the committee member sent them.
              Every line gets one answer: credited to them, duplicate owned by an earlier referrer,
              already here with no owner, or missing. Nothing is ever taken from another member.
            </p>
          </div>
        </div>

        <Select value={inviterId} onValueChange={setInviterId}>
          <SelectTrigger>
            <SelectValue placeholder="Committee member" />
          </SelectTrigger>
          <SelectContent>
            {inviters.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleImages(e.target.files)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={extracting}
            className="flex-1 min-w-[10rem]"
          >
            {extracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            Upload screenshots
          </Button>
          <Button
            onClick={() => void handleReconcile()}
            disabled={busy || !inviterId || lines.length === 0}
            className="flex-1 min-w-[10rem]"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
            Match {lines.length > 0 ? `${lines.length} line${lines.length === 1 ? "" : "s"}` : "list"}
          </Button>
        </div>

        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          placeholder={"One person or household per line, e.g.\nOdelia Olvera 402-871-1602\nGisel and Said 402-253-4328"}
        />
        <p className="text-xs text-muted-foreground">
          {lines.length} line{lines.length === 1 ? "" : "s"} ready.
        </p>
      </Card>

      {result && s && (
        <>
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{result.inviterName}</p>
                <p className="text-xs text-muted-foreground">
                  Currently credited in the system: {s.currentlyCredited}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={downloadCsv}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Lines submitted" value={s.lines} />
              <Stat label="People (households counted out)" value={s.submittedPeople} />
              <Stat label="Credited to them" value={s.owned} />
              <Stat label="Duplicates (earlier owner)" value={s.duplicate} />
              <Stat label="Here with no owner" value={s.unowned} />
              <Stat label="Missing from the system" value={s.missing} />
            </div>
            {(s.missing > 0 || s.unowned > 0 || s.duplicate > 0) && (
              <Button onClick={() => void handleApply()} disabled={applying} className="w-full">
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Add {s.missing} missing, claim {s.unowned} unowned, log {s.duplicate} duplicates
              </Button>
            )}
          </Card>

          <Card className="divide-y">
            {result.rows.map((r) => {
              const style = outcomeStyles[r.outcome];
              return (
                <div key={r.index} className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {r.index + 1}. {r.name || r.matchedName || "(no name)"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPhoneUS(r.phone) || r.phone || "no phone"}
                        {r.people > 1 ? ` · ${r.people} people` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={style.className}>
                      {style.label}
                    </Badge>
                  </div>
                  {r.outcome === "duplicate" && (
                    <p className="text-xs text-amber-700">
                      Credited to {r.ownerName} (loaded first
                      {r.ownerCreatedAt ? ` on ${new Date(r.ownerCreatedAt).toLocaleDateString()}` : ""}
                      ) — stays with them.
                    </p>
                  )}
                  {r.outcome === "owned" && r.matchedName && r.matchedName !== r.name && (
                    <p className="text-xs text-muted-foreground">
                      Matched to “{r.matchedName}” by {r.matchedBy}.
                    </p>
                  )}
                  {r.outcome === "unowned" && (
                    <p className="text-xs text-sky-700">
                      In the system with no referral owner — will be credited to {result.inviterName}.
                    </p>
                  )}
                  {r.rsvpStatus && (
                    <p className="text-xs text-muted-foreground">RSVP: {r.rsvpStatus}</p>
                  )}
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-lg font-semibold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
