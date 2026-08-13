import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/async-safety";
import { downloadTextFile, openTextInNewTab } from "@/lib/download-file";
import {
  getMealTextData,
  type MealTextBatchReconciliation,
  type MealTextRow,
} from "@/lib/meal-texts.functions";

export const Route = createFileRoute("/_authenticated/admin/meal-texts")({
  head: () => ({
    meta: [
      { title: "Meal text status — A Taste of Special Conventions" },
      {
        name: "description",
        content: "Read-only August 12 meal instruction text status by cuisine.",
      },
      { property: "og:title", content: "Meal text status" },
      {
        property: "og:description",
        content: "Sent and not-sent meal instruction contacts organized by cuisine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MealTextsPage,
});

type StatusRow = MealTextRow & { sent: boolean };

const CUISINE_ORDER = ["African", "Indonesian", "Myanmar"];

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) return value || "No phone on file";
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const csvEscape = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function MealTextsPage() {
  const load = useServerFn(getMealTextData);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MealTextRow[]>([]);
  const [batch, setBatch] = useState<MealTextBatchReconciliation | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const result = await load({ data: {} as never });
        if (!active) return;
        setRows(result.rows);
        setBatch(result.batchReconciliation);
      } catch (error) {
        toast.error("Couldn't load the meal text status", {
          description: getErrorMessage(error),
        });
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [load]);

  const sentContactIds = useMemo(
    () => new Set(batch?.reconstructed_contact_ids ?? []),
    [batch],
  );

  const statusRows = useMemo<StatusRow[]>(
    () => rows.map((row) => ({ ...row, sent: sentContactIds.has(row.id) })),
    [rows, sentContactIds],
  );

  const cuisines = useMemo(
    () => CUISINE_ORDER.map((cuisine) => ({
      cuisine,
      sent: statusRows
        .filter((row) => row.cuisine === cuisine && row.sent)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
      notSent: statusRows
        .filter((row) => row.cuisine === cuisine && !row.sent)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    })),
    [statusRows],
  );

  const uniqueContacts = new Set(rows.map((row) => row.id)).size;
  const sentContacts = new Set(statusRows.filter((row) => row.sent).map((row) => row.id)).size;
  const notSentContacts = uniqueContacts - sentContacts;

  const downloadRoster = () => {
    const csv = [
      ["Cuisine", "Status", "Sent date", "Name", "Phone", "Meals"].join(","),
      ...cuisines.flatMap(({ cuisine, sent, notSent }) => [
        ...sent.map((row) => [cuisine, "SENT", "August 12, 2026", row.name, formatPhone(row.phone), row.qty]),
        ...notSent.map((row) => [cuisine, "NOT SENT", "", row.name, formatPhone(row.phone), row.qty]),
      ]).map((record) => record.map(csvEscape).join(",")),
    ].join("\n");
    const result = downloadTextFile("meal-text-status-2026-08-12.csv", csv);
    if (result.ok) {
      toast.success("Meal text status downloaded");
      return;
    }
    const fallback = openTextInNewTab(csv);
    if (fallback.ok) toast.success("Meal text status opened in a new tab");
    else toast.error("Couldn't download the meal text status", { description: fallback.reason });
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-3 py-4 sm:px-6 sm:py-8">
      <header className="space-y-3 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-1 h-6 w-6 shrink-0 text-terracotta" aria-hidden="true" />
          <div>
            <h1 className="font-display text-3xl">Meal text status</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Read-only record of who was marked sent on August 12, 2026 and who was not.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading exact status…
          </div>
        ) : (
          <div className="grid grid-cols-3 divide-x divide-border border-y border-border py-3 text-center">
            <div>
              <strong className="block text-xl">{uniqueContacts}</strong>
              <span className="text-xs text-muted-foreground">Total contacts</span>
            </div>
            <div>
              <strong className="block text-xl text-emerald-700">{sentContacts}</strong>
              <span className="text-xs text-muted-foreground">Sent Aug 12</span>
            </div>
            <div>
              <strong className="block text-xl text-brand-red">{notSentContacts}</strong>
              <span className="text-xs text-muted-foreground">Not sent</span>
            </div>
          </div>
        )}

        <Button size="sm" variant="outline" onClick={downloadRoster} disabled={loading}>
          <Download className="mr-2 h-4 w-4" /> Download this exact roster
        </Button>
      </header>

      {!loading && cuisines.map(({ cuisine, sent, notSent }) => (
        <section key={cuisine} className="space-y-4" aria-labelledby={`${cuisine}-heading`}>
          <div className="border-b-2 border-foreground pb-2">
            <h2 id={`${cuisine}-heading`} className="font-display text-2xl">
              {cuisine === "Myanmar" ? "Myanmar (Burmese)" : cuisine}
            </h2>
            <p className="text-sm text-muted-foreground">
              {sent.length} sent · {notSent.length} not sent
            </p>
          </div>

          <StatusSection title="NOT SENT" rows={notSent} sent={false} />
          <StatusSection title="SENT — AUGUST 12, 2026" rows={sent} sent />
        </section>
      ))}
    </main>
  );
}

function StatusSection({ title, rows, sent }: { title: string; rows: StatusRow[]; sent: boolean }) {
  return (
    <div className="overflow-hidden border border-border">
      <h3 className={sent
        ? "bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-900"
        : "bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground"
      }>
        {title} ({rows.length})
      </h3>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">No one in this section.</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={`${row.id}-${row.cuisine}`} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold leading-tight">{row.name}</p>
                <p className="mt-1 font-mono text-sm">{formatPhone(row.phone)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{row.qty} meal{row.qty === 1 ? "" : "s"}</p>
                <p className={sent ? "text-xs font-bold text-emerald-700" : "text-xs font-bold text-brand-red"}>
                  {sent ? "SENT AUG 12" : "NOT SENT"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}