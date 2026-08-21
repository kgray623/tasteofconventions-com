import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Check, Download, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordMealPaymentDialog } from "@/components/record-meal-payment-dialog";
import { SmsTextButton } from "@/components/sms-text-button";
import { UnpaidByCommittee } from "@/components/unpaid-by-committee";

import { getErrorMessage } from "@/lib/async-safety";
import { downloadTextFile, openTextInNewTab } from "@/lib/download-file";
import { isPaidState, type OrphanSentMark } from "@/lib/meal-communication";
import {
  cuisineLabel,
  matchRestaurant,
  mealOrderText,
  mealPhotosLine,
  paymentLines,
  renderMealTemplate,
  smsNumber,
  zelleQrLinkLine,
} from "@/lib/meal-text-message";
import {
  getMealTextData,
  markZelleTextSent,
  type MealRestaurant,
  type MealTextExcludedRow,
  type MealTextRow,
} from "@/lib/meal-texts.functions";

export const Route = createFileRoute("/_authenticated/admin/meal-texts")({
  head: () => ({
    meta: [
      { title: "Event payment texts — Taste of Conventions" },
      { name: "description", content: "Event-wide catered-meal payment outreach and payment status." },
      { property: "og:title", content: "Event payment texts" },
      { property: "og:description", content: "Unpaid and paid catered-meal orders for the event team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MealTextsPage,
});

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
  const markSent = useServerFn(markZelleTextSent);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rows, setRows] = useState<MealTextRow[]>([]);
  const [excluded, setExcluded] = useState<MealTextExcludedRow[]>([]);
  const [orphanMarks, setOrphanMarks] = useState<OrphanSentMark[]>([]);
  const [restaurants, setRestaurants] = useState<MealRestaurant[]>([]);
  const [template, setTemplate] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await load({ data: {} as never });
      setRows(result.rows);
      setExcluded(result.excluded);
      setOrphanMarks((result.orphanMarks ?? []) as OrphanSentMark[]);
      setRestaurants(result.restaurants);
      setTemplate(result.zelleTemplate);
      setIsAdmin(result.isAdmin);
      setGeneratedAt(result.reconciliation.generated_at);
    } catch (error) {
      toast.error("Couldn't load event payment bookkeeping", { description: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [load]);

  const needsText = useMemo(() => rows.filter((row) => row.state === "needs_update" || row.state === "exception"), [rows]);
  const textedDue = useMemo(() => rows.filter((row) => row.state === "update_sent"), [rows]);
  const paidReported = useMemo(() => rows.filter((row) => row.state === "paid_reported"), [rows]);
  const paidConfirmed = useMemo(() => rows.filter((row) => row.state === "paid_confirmed"), [rows]);
  const unpaid = [...needsText, ...textedDue];
  const totalPlates = rows.reduce((sum, row) => sum + row.qty, 0);
  const unpaidPlates = unpaid.reduce((sum, row) => sum + row.qty, 0);
  const paidPlates = totalPlates - unpaidPlates;

  const bodyFor = (row: MealTextRow) => {
    const restaurant = matchRestaurant(restaurants, row.cuisine);
    return renderMealTemplate(template, {
      ...paymentLines(restaurant),
      firstName: row.name.split(/\s+/)[0] ?? row.name,
      restaurantName: restaurant?.name ?? row.cuisine,
      restaurantCuisine: cuisineLabel(restaurant?.cuisine?.trim() || row.cuisine),
      restaurantPhone: restaurant?.phone?.trim() || "[restaurant phone unavailable]",
      restaurantWebsite: restaurant?.website?.trim() || "",
      order: mealOrderText(row.qty, row.cuisine),
      mealPhotos: mealPhotosLine(row.cuisine),
      zelleQrLink: zelleQrLinkLine(row.cuisine, restaurant),
      zelleLink: "",
    });
  };

  const updateTextMark = async (row: MealTextRow, sent: boolean) => {
    const key = `${row.id}::${row.cuisine}`;
    setBusy(key);
    try {
      await markSent({ data: { marks: [{ preorderId: row.id, cuisine: row.cuisine }], sent } });
      await refresh();
    } catch (error) {
      toast.error("Couldn't update the payment-text mark", { description: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const downloadRoster = () => {
    const status = (row: MealTextRow) => row.state === "paid_confirmed"
      ? "PAID — RESTAURANT CONFIRMED"
      : row.state === "paid_reported"
        ? "PAID REPORTED — AWAITING CONFIRMATION"
        : row.state === "update_sent"
          ? "TEXT SENT — PAYMENT STILL DUE"
          : "NEEDS PAYMENT TEXT";
    const csv = [
      ["Payment status", "Text status", "Cuisine", "Name", "Phone", "Inviter", "Plates", "Paid date"].join(","),
      ...rows.map((row) => [
        status(row), row.zelle_sent_at ? "SENT" : "NOT SENT", row.cuisine, row.name,
        formatPhone(row.phone), row.inviter, row.qty, row.paid_at ?? "",
      ].map(csvEscape).join(",")),
    ].join("\n");
    const result = downloadTextFile(`event-meal-payment-bookkeeping-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    if (result.ok) toast.success("Event payment bookkeeping downloaded");
    else if (openTextInNewTab(csv).ok) toast.success("Event payment bookkeeping opened in a new tab");
    else toast.error("Couldn't export the event payment bookkeeping");
  };

  return (
    <main className="space-y-6">
      <header className="space-y-4 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-1 h-6 w-6 shrink-0 text-terracotta" aria-hidden="true" />
          <div>
            <h1 className="font-display text-3xl">Event payment texts</h1>
            <p className="mt-1 text-sm text-muted-foreground">Everyone with an active catered-meal preorder, compared directly with recorded payments.</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Reading current payments…</div>
        ) : (
          <div className="grid grid-cols-2 border-y border-border text-center sm:grid-cols-4">
            <Metric value={rows.length} label="Cuisine orders" />
            <Metric value={totalPlates} label="Plates ordered" />
            <Metric value={unpaidPlates} label="Plates still to pay" />
            <Metric value={paidPlates} label="Plates paid/reported" />
          </div>
        )}
        {!loading && excluded.length > 0 && (
          <p className="text-sm text-destructive">
            {excluded.length} more cuisine {excluded.length === 1 ? "order is" : "orders are"} excluded from these
            counts because the RSVP is a decline, Zoom-only, or missing — listed at the bottom of this page.
          </p>
        )}
        <Button size="sm" variant="outline" onClick={downloadRoster} disabled={loading}>
          <Download className="mr-2 h-4 w-4" /> Download exact bookkeeping
        </Button>
        {generatedAt && <p className="text-xs text-muted-foreground">Database read: {new Date(generatedAt).toISOString().replace("T", " ").slice(0, 16)} UTC</p>}
      </header>

      {!loading && (
        <>
          <RosterSection title="Needs payment text" description="No payment is recorded and no payment text is marked sent." rows={needsText} tone="urgent" bodyFor={bodyFor} busy={busy} onMark={updateTextMark} isAdmin={isAdmin} onRefresh={refresh} />
          <RosterSection title="Text sent — payment still due" description="The payment instructions were marked sent, but payment is still not recorded." rows={textedDue} tone="waiting" bodyFor={bodyFor} busy={busy} onMark={updateTextMark} isAdmin={isAdmin} onRefresh={refresh} />
          <RosterSection title="Reported paid — awaiting restaurant confirmation" description="A guest or team member reported payment. These people are not chased for payment." rows={paidReported} tone="paid" bodyFor={bodyFor} busy={busy} onMark={updateTextMark} isAdmin={isAdmin} onRefresh={refresh} />
          <RosterSection title="Restaurant confirmed paid" description="Payment is confirmed by the restaurant." rows={paidConfirmed} tone="paid" bodyFor={bodyFor} busy={busy} onMark={updateTextMark} isAdmin={isAdmin} onRefresh={refresh} />
          <UnpaidByCommittee rows={rows} generatedAt={generatedAt} restaurants={restaurants} />
          <ExcludedSection rows={excluded} />
          <OrphanMarksSection rows={orphanMarks} />

        </>
      )}
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="border-b border-r border-border p-3 sm:border-b-0"><strong className="block text-xl">{value}</strong><span className="text-xs text-muted-foreground">{label}</span></div>;
}

/**
 * Text marks that are real human actions but whose cuisine is no longer on the
 * guest's order. Kept visible on purpose so no sent text is ever lost.
 */
function OrphanMarksSection({ rows }: { rows: OrphanSentMark[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div>
        <h2 className="font-display text-xl">Texts sent for a cuisine no longer on the order</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These marks are kept exactly as recorded. The guest changed or removed that cuisine after the text was
          sent, so the mark has no current order line above.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{rows.length} recorded {rows.length === 1 ? "mark" : "marks"}</p>
      </div>
      <div className="divide-y divide-border border border-border">
        {rows.map((row) => (
          <div key={`${row.preorder_id}-${row.cuisine}`} className="px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{row.name}</strong>
              <span className="font-mono text-xs">{formatPhone(row.phone)}</span>
              <Badge variant="outline">{cuisineLabel(row.cuisine)}</Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Payment text {row.update_sent_at ? `marked sent ${new Date(row.update_sent_at).toLocaleDateString()}` : "never marked sent"}
              {" · "}
              Order text {row.original_sent_at ? `marked sent ${new Date(row.original_sent_at).toLocaleDateString()}` : "never marked sent"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


/**
 * Read-only evidence list. These meal orders are kept in the database exactly as
 * submitted, but they sit outside the payment chase because the RSVP is not
 * "yes". No Text / Mark sent / Already paid buttons here on purpose.
 */
function ExcludedSection({ rows }: { rows: MealTextExcludedRow[] }) {
  if (rows.length === 0) return null;
  const groups = [...CUISINE_ORDER, "Other"]
    .map((cuisine) => ({
      cuisine,
      rows: rows.filter((row) =>
        cuisine === "Other" ? !CUISINE_ORDER.includes(row.cuisine) : row.cuisine === cuisine,
      ),
    }))
    .filter((group) => group.rows.length > 0);

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div>
        <h2 className="font-display text-xl">Excluded — meal on file but not attending in person</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kept exactly as submitted, never deleted. These orders are not counted above and nobody here is chased
          for payment.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{rows.length} cuisine orders</p>
      </div>
      {groups.map((group) => (
        <div key={group.cuisine} className="space-y-2">
          <h3 className="text-sm font-semibold">
            {group.cuisine === "Other" ? "Other" : cuisineLabel(group.cuisine)} · {group.rows.length}
          </h3>
          {group.rows.map((row) => (
            <div key={`${row.id}-${row.cuisine}`} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{row.name}</strong>
                <Badge variant="outline">RSVP {row.rsvp_status}</Badge>
                {row.attendance_mode === "zoom" && <Badge variant="outline">Zoom</Badge>}
                {row.paid && <Badge variant="outline">Payment recorded</Badge>}
              </div>
              <div className="text-muted-foreground">{formatPhone(row.phone)}</div>
              <div className="text-muted-foreground">Invited by {row.inviter}</div>
              <div className="mt-1">
                {row.qty} {row.qty === 1 ? "plate" : "plates"} · {cuisineLabel(row.cuisine)}
              </div>
              <div className="mt-1 text-destructive">{row.reason}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Payment text {row.zelle_sent_at ? `marked sent ${new Date(row.zelle_sent_at).toLocaleDateString()}` : "never marked sent"}
                {" · "}
                Order text {row.sent_at ? `marked sent ${new Date(row.sent_at).toLocaleDateString()}` : "never marked sent"}
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function RosterSection({ title, description, rows, tone, bodyFor, busy, onMark, isAdmin, onRefresh }: {
  title: string;
  description: string;
  rows: MealTextRow[];
  tone: "urgent" | "waiting" | "paid";
  bodyFor: (row: MealTextRow) => string;
  busy: string | null;
  onMark: (row: MealTextRow, sent: boolean) => Promise<void>;
  isAdmin: boolean;
  onRefresh: () => Promise<void>;
}) {
  const groups = CUISINE_ORDER.map((cuisine) => ({ cuisine, rows: rows.filter((row) => row.cuisine === cuisine) }))
    .filter((group) => group.rows.length > 0);
  return (
    <section className="space-y-4" aria-label={title}>
      <div className="border-b-2 border-foreground pb-2">
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-2xl">{title}</h2><Badge variant="outline">{rows.length} cuisine orders</Badge></div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {rows.length === 0 && <p className="border border-border p-4 text-sm text-muted-foreground">No one is in this section.</p>}
      {groups.map(({ cuisine, rows: cuisineRows }) => (
        <div key={cuisine} className="border border-border">
          <h3 className="border-b border-border px-3 py-2 font-semibold">{cuisineLabel(cuisine)} · {cuisineRows.length}</h3>
          <div className="divide-y divide-border">
            {cuisineRows.map((row) => {
              const number = smsNumber(row.phone);
              const key = `${row.id}::${row.cuisine}`;
              return (
                <div key={key} className="space-y-3 px-3 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-semibold">{row.name}</p><p className="font-mono text-sm">{formatPhone(row.phone)}</p><p className="text-xs text-muted-foreground">Invited by {row.inviter}</p></div>
                    <div className="shrink-0 text-right"><p className="font-semibold">{row.qty} plate{row.qty === 1 ? "" : "s"}</p><p className="text-xs text-muted-foreground">{cuisineLabel(row.cuisine)}</p></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {tone === "urgent" && number && <SmsTextButton numbers={[number]} body={bodyFor(row)} label={`Text ${row.name.split(/\s+/)[0]}`} />}
                    {tone === "urgent" && (
                      <Button size="sm" variant="outline" disabled={busy === key} onClick={() => void onMark(row, true)}><Check className="mr-1.5 h-3.5 w-3.5" /> Check after text is sent</Button>
                    )}
                    {tone === "waiting" && (
                      <Button size="sm" variant="ghost" disabled={busy === key} onClick={() => void onMark(row, false)}>Undo sent mark</Button>
                    )}
                    {!isPaidState(row.state) && isAdmin && <RecordMealPaymentDialog preorderId={row.id} guestName={row.name} orders={[{ cuisine: row.cuisine, qty: row.qty }]} onRecorded={onRefresh} label="They already paid" variant="ghost" />}
                    {tone === "paid" && <Badge variant="outline">{row.state === "paid_confirmed" ? "Restaurant confirmed" : "Reported paid"}{row.paid_at ? ` · ${new Date(row.paid_at).toLocaleDateString()}` : ""}</Badge>}
                    {row.exception && <span className="text-xs font-medium text-destructive">{row.exception}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}