import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, Globe, Loader2, MessageSquare, Phone, RotateCcw, Utensils, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { readAtUtc } from "@/lib/meal-count-labels";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/async-safety";
import { downloadTextFile, openTextInNewTab } from "@/lib/download-file";
import {
  smsNumber,
  cuisineLabel,
  paymentLines,
  renderMealTemplate,
  mealPhotosLine,
  zelleQrLinkLine,

} from "@/lib/meal-text-message";
import { SmsTextButton } from "@/components/sms-text-button";
import { MealTextSelfTest } from "@/components/meal-text-self-test";
import { OpenOnSiteBanner } from "@/components/open-on-site-banner";
import { isPaidState } from "@/lib/meal-communication";

import {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  DEFAULT_ZELLE_UPDATE_TEMPLATE,
  confirmMealInstructionText,
  getMealTextData,
  markZelleTextSent,
  reconcilePaymentTextContact,
  saveMealTextTemplate,
  saveRestaurantContact,
  type MealRestaurant,
  type MealInstructionQueueContact,
  type MealTextBatchReconciliation,
  type MealTextEvidenceLine,
  type MealTextRow,
} from "@/lib/meal-texts.functions";

export const Route = createFileRoute("/_authenticated/admin/meal-texts")({
  head: () => ({
    meta: [
      { title: "Meal texts — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Send each guest who pre-ordered a cultural meal the restaurant's name and phone number, straight from your own phone.",
      },
      { property: "og:title", content: "Meal texts" },
      {
        property: "og:description",
        content: "One-tap pre-order texts for everyone who ordered a cultural meal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MealTextsPage,
});



const orderText = (qty: number, cuisine: string) =>
  `${qty} ${cuisine} meal${qty === 1 ? "" : "s"}`;

function MealTextsPage() {
  const load = useServerFn(getMealTextData);
  const saveContact = useServerFn(saveRestaurantContact);
  const saveTemplate = useServerFn(saveMealTextTemplate);
  const markZelle = useServerFn(markZelleTextSent);
  const confirmInstruction = useServerFn(confirmMealInstructionText);
  const reconcileContact = useServerFn(reconcilePaymentTextContact);

  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<MealRestaurant[]>([]);
  const [rows, setRows] = useState<MealTextRow[]>([]);
  const [instructionQueue, setInstructionQueue] = useState<MealInstructionQueueContact[]>([]);
  const [batchReconciliation, setBatchReconciliation] = useState<MealTextBatchReconciliation | null>(null);
  const [todayEvidence, setTodayEvidence] = useState<{ utc_day: string; lines: MealTextEvidenceLine[] }>({ utc_day: "", lines: [] });
  const [kariTestRows, setKariTestRows] = useState<MealTextRow[]>([]);
  // Who is signed in, so the test panel can text the message to yourself.
  const [self, setSelf] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  // Read-only look at any guest's exact message. Opening it records nothing.
  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null);
  const [template, setTemplate] = useState(DEFAULT_MEAL_TEXT_TEMPLATE);
  const [zelleTemplate, setZelleTemplate] = useState(DEFAULT_ZELLE_UPDATE_TEMPLATE);
  // One queue only: the payment update. The original meal message history is
  // reference only and never gates this list.
  const [savingTpl, setSavingTpl] = useState(false);
  // Wording edits must never be lost silently: dirty until a save is read back.
  const [tplDirty, setTplDirty] = useState(false);
  const [tplSavedAt, setTplSavedAt] = useState<string | null>(null);
  const [tplError, setTplError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "needs" | "sent" | "paid">("needs");
  const [inviterFilter, setInviterFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<{
    totals: {
      households: number;
      message_units: number;
      meal_quantity: number;
      paid: number;
      paid_confirmed: number;
      paid_reported: number;
      needs_update: number;
      update_sent: number;
      exceptions: number;
      reconciles: boolean;
      plates_reconcile: boolean;
      paid_meal_quantity: number;
      unpaid_meal_quantity: number;
    };
    generated_at: string;
    text_accounting: {
      original: { active_lines: number; active_households: number; live_rows: number; historical_deletes: number; retained_events: number };
      payment_update: { active_lines: number; active_households: number; live_rows: number; historical_deletes: number; retained_events: number };
      actors: Array<{
        actor_id: string | null;
        actor_name: string;
        original_lines: number;
        original_households: number;
        payment_update_lines: number;
        payment_update_households: number;
      }>;
    };
    committee_orders: Array<{
      invitation_id: string;
      name: string;
      phone: string;
      status: "active_order" | "no_order" | "linkage_exception";
      order_lines: number;
      plates: number;
      selections: string;
    }>;
    committee_totals: { members: number; active_orderers: number; no_order: number; order_lines: number; plates: number };
  } | null>(null);

  const refresh = async (opts?: { keepWording?: boolean }) => {
    setLoading(true);
    try {
      const res = await load({ data: {} as never });
      setRestaurants(res.restaurants);
      setRows(res.rows);
      setInstructionQueue(res.instructionQueue);
      setBatchReconciliation(res.batchReconciliation);
      setTodayEvidence(res.todayEvidence);
      setKariTestRows(res.kariTestRows);
      // Prefill the test panel: signed-in phone, else the retained preorder phone.
      setSelf({
        name: res.self?.name || res.kariTestRows[0]?.name || "",
        phone: res.self?.phone || res.kariTestRows[0]?.phone || "",
      });
      setTemplate(res.template);
      // Never overwrite wording the user is still editing.
      if (!opts?.keepWording) {
        setZelleTemplate(res.zelleTemplate);
        setTplDirty(false);
      }
      setReconciliation(res.reconciliation);
    } catch (e) {
      toast.error("Couldn't load the meal orders", { description: getErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    void refresh();
  }, []);

  const restaurantFor = (cuisine: string) =>
    restaurants.find(
      (r) =>
        (r.cuisine ?? "").toLowerCase() === cuisine.toLowerCase() ||
        r.name.toLowerCase() === cuisine.toLowerCase() ||
        (cuisine === "Myanmar" && r.name.toLowerCase().includes("burmese")),
    );

  const confirmedEvidenceKeys = useMemo(
    () => new Set(todayEvidence.lines.filter((line) => line.decision === "confirmed").map((line) => `${line.preorder_id}::${line.cuisine}`)),
    [todayEvidence],
  );
  const needsTextRows = useMemo(
    () => rows.filter((r) => !isPaidState(r.state) && !confirmedEvidenceKeys.has(`${r.id}::${r.cuisine}`)),
    [confirmedEvidenceKeys, rows],
  );
  const textSentRows = useMemo(() => rows.filter((r) => r.state === "update_sent"), [rows]);
  const paidRows = useMemo(() => rows.filter((r) => isPaidState(r.state)), [rows]);

  // These rows are supplied explicitly by the authenticated server response
  // from Kari's retained preorder. They never depend on queue classification.
  const kariMockByCuisine = useMemo(() => {
    return new Map(kariTestRows.map((row) => [row.cuisine, row] as const));
  }, [kariTestRows]);

  const groups = useMemo(() => {
    const map = new Map<string, MealTextRow[]>();
    for (const r of rows) {
      if (!map.has(r.cuisine)) map.set(r.cuisine, []);
      map.get(r.cuisine)?.push(r);
    }
    for (const cuisine of kariMockByCuisine.keys()) {
      if (!map.has(cuisine)) map.set(cuisine, []);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [kariMockByCuisine, rows]);

  const inviterOptions = useMemo(() => {
    // Count outstanding restaurant texts (one per guest per cuisine), so this
    // matches the pending numbers on the tracker card exactly.
    const seen = new Map<string, number>();
    for (const r of needsTextRows) {
      seen.set(r.inviter, (seen.get(r.inviter) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [needsTextRows]);

  const eventContacts = useMemo(() => {
    const marked = new Set(todayEvidence.lines.map((line) => `${line.preorder_id}::${line.cuisine}`));
    const decisions = new Map<string, "confirmed" | "disputed" | null>(
      todayEvidence.lines.map((line) => [`${line.preorder_id}::${line.cuisine}`, line.decision]),
    );
    const byContact = new Map<string, MealTextRow[]>();
    for (const row of rows) {
      const current = byContact.get(row.id) ?? [];
      current.push(row);
      byContact.set(row.id, current);
    }
    return [...byContact.values()].map((contact) => {
      const orders = contact.map((row) => {
        const key = `${row.id}::${row.cuisine}`;
        const decision = decisions.get(key);
        const textStatus = isPaidState(row.state) ? "paid" as const
          : decision === "disputed" ? "disputed" as const
          : decision === "confirmed" ? "confirmed" as const
          : marked.has(key) ? "needs" as const
          : "needs" as const;
        return { row, textStatus };
      });
      const status = orders.every((order) => order.textStatus === "paid") ? "paid" as const
        : orders.some((order) => order.textStatus === "needs" || order.textStatus === "disputed") ? "needs" as const
        : "confirmed" as const;
      return {
        id: contact[0]?.id ?? "",
        name: contact[0]?.name ?? "Guest",
        phone: contact[0]?.phone ?? "",
        inviter: contact[0]?.inviter ?? "Not linked",
        totalPlates: contact.reduce((sum, row) => sum + row.qty, 0),
        orders,
        status,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, todayEvidence]);

  const visibleEventContacts = eventContacts.filter((contact) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "sent") return contact.status === "confirmed";
    return contact.status === statusFilter;
  }).filter((contact) => inviterFilter === "all" || contact.inviter === inviterFilter);
  const instructionMessageCount = instructionQueue.reduce((sum, contact) => sum + contact.orders.length, 0);

  const reconcileOneContact = async (contact: (typeof eventContacts)[number], decision: "confirmed" | "disputed") => {
    const key = `contact::${contact.id}`;
    setBusy(key);
    try {
      await reconcileContact({ data: {
        preorderId: contact.id,
        cuisines: contact.orders.filter((order) => order.textStatus !== "paid").map((order) => order.row.cuisine),
        decision,
      } });
      await refresh({ keepWording: true });
      toast.success(decision === "confirmed" ? "Physical send confirmed" : "Contact remains on the missing list");
    } catch (e) {
      toast.error("Couldn't save the contact review", { description: getErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  const downloadPending = () => {
    const pending = instructionQueue.flatMap((contact) => contact.orders);
    if (pending.length === 0) {
      toast.error("Everyone in this list has been texted");
      return;
    }
    const esc = (v: unknown) => {
      const t = String(v ?? "");
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const csv = [
      ["Guest", "Phone", "Cuisine", "Meals", "Committee member", "Instruction status"].join(","),
      ...pending.map((r) =>
        [r.name, r.phone, r.cuisine, r.qty, r.inviter, "Needs instruction text"].map(esc).join(","),
      ),
    ].join("\n");
    const name = `needs-meal-instructions-${new Date().toISOString().slice(0, 10)}.csv`;
    const res = downloadTextFile(name, csv);
    if (res.ok) {
      toast.success("Pending list downloaded");
      return;
    }
    const tab = openTextInNewTab(csv);
    if (tab.ok) toast.success("Opened the pending list in a new tab");
    else toast.error("Couldn't download", { description: tab.reason });
  };

  const bodyFor = (row: MealTextRow) => {
    const r = restaurantFor(row.cuisine);
    const pay = paymentLines(r);
    return renderMealTemplate(zelleTemplate, {
      ...pay,
      firstName: row.name.split(/\s+/)[0] ?? row.name,
      restaurantName: r?.name ?? row.cuisine,
      restaurantCuisine: cuisineLabel(r?.cuisine?.trim() || row.cuisine),
      restaurantPhone: r?.phone?.trim() || "[add the restaurant's phone number]",
      restaurantWebsite: r?.website?.trim() || "",
      order: orderText(row.qty, row.cuisine),
      mealPhotos: mealPhotosLine(row.cuisine),
      zelleQrLink: zelleQrLinkLine(row.cuisine, r),
      zelleLink: "",

    });
  };

  const setSent = async (row: MealTextRow, sent: boolean) => {
    const key = `${row.id}::${row.cuisine}`;
    setBusy(key);
    try {
      const data = { marks: [{ preorderId: row.id, cuisine: row.cuisine }], sent };
      const res = await markZelle({ data });
      if (res.ok) await refresh({ keepWording: true });
    } catch (e) {
      toast.error("Couldn't update the sent mark", { description: getErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  };


  const updateContact = async (
    r: MealRestaurant,
    phone: string,
    orderReady: boolean,
    website?: string | null,
  ) => {
    const nextWebsite = website === undefined ? r.website : website;
    setRestaurants((prev) =>
      prev.map((x) =>
        x.id === r.id ? { ...x, phone, order_ready: orderReady, website: nextWebsite } : x,
      ),
    );
    try {
      await saveContact({ data: { id: r.id, phone, orderReady, website: nextWebsite ?? null } });
    } catch (e) {
      toast.error("Couldn't save the restaurant details", { description: getErrorMessage(e) });
    }
  };


  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied");
      return true;
    } catch (e) {
      toast.error("Couldn't copy", { description: getErrorMessage(e) });
      return false;
    }
  };

  const copyNumber = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Phone number copied");
    } catch (e) {
      toast.error("Couldn't copy the phone number", { description: getErrorMessage(e) });
    }
  };

  const totalOrders = reconciliation?.totals.message_units ?? rows.length;
  const totalHouseholds = reconciliation?.totals.households ?? new Set(rows.map((r) => r.id)).size;
  const totalMeals = reconciliation?.totals.meal_quantity ?? rows.reduce((s, r) => s + r.qty, 0);
  const paidContacts = new Set(paidRows.map((row) => row.id)).size;
  const pendingContacts = new Set(needsTextRows.map((row) => row.id)).size;
  const sentCount = textSentRows.length;
  const paidCount = paidRows.length;
  const needsTextCount = needsTextRows.length;

  const downloadNeedsText = () => {
    if (instructionQueue.length === 0) {
      toast.success("Everyone has confirmed meal instructions");
      return;
    }
    const esc = (value: unknown) => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = [
      ["Guest", "Phone", "Cuisine", "Meals", "Committee member", "Status"].join(","),
      ...instructionQueue.flatMap((contact) => contact.orders
        .map((row) => [row.name, row.phone, row.cuisine, row.qty, row.inviter, "Needs instruction text"].map(esc).join(","))),
    ].join("\n");
    const result = downloadTextFile(`needs-meal-instructions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    if (result.ok) toast.success("Needs-text list downloaded");
    else {
      const tab = openTextInNewTab(csv);
      if (tab.ok) toast.success("Opened the needs-text list in a new tab");
      else toast.error("Couldn't download", { description: tab.reason });
    }
  };

  const confirmInstructionSent = async (row: MealTextRow) => {
    const key = `instruction::${row.id}::${row.cuisine}`;
    setBusy(key);
    try {
      await confirmInstruction({ data: { preorderId: row.id, cuisine: row.cuisine } });
      await refresh({ keepWording: true });
      toast.success(`${row.name}’s ${row.cuisine} instruction text confirmed`);
    } catch (e) {
      toast.error("Couldn't confirm the physical text", { description: getErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <OpenOnSiteBanner />
      <Card className="space-y-4 border-amber-400 p-5">
        <div className="flex items-start gap-2">
          <MessageSquare className="mt-1 h-5 w-5 shrink-0 text-terracotta" />
          <div>
            <h1 className="font-display text-2xl">Meal-order contacts you still need to text</h1>
            <p className="text-sm text-muted-foreground">
              Every active meal preorder phone minus the people you explicitly marked sent on August 12.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {totalHouseholds} total meal-order contacts
          </Badge>
          <Badge variant="outline">
            {batchReconciliation?.reconstructed_count ?? 0} marked sent August 12
          </Badge>
          <Badge variant={instructionQueue.length === 0 ? "outline" : "destructive"}>
            {instructionQueue.length} remaining
          </Badge>
        </div>
        <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">
          Paid contacts remain included because payment does not prove they received restaurant instructions. Cancelled meals,
          declines, and Zoom attendees are excluded without deleting their history.
        </div>
        <div className="divide-y divide-border rounded-md border border-border">
          {loading && <p className="p-3 text-sm text-muted-foreground">Loading the current list…</p>}
          {!loading && instructionQueue.length === 0 && <p className="p-3 text-sm text-muted-foreground">No meal-order contacts remain.</p>}
          {instructionQueue.map((contact) => (
            <div key={contact.id} className="space-y-3 p-3">
              <div>
                <p className="font-medium">{contact.name}</p>
                <p className="text-sm text-muted-foreground">{contact.phone || "No phone on file"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {contact.orders.map((row) => <Badge key={row.cuisine} variant="destructive">{row.cuisine} ×{row.qty}</Badge>)}
              </div>
              <div className="flex flex-wrap gap-2">
                {contact.orders.map((row) => {
                    const number = smsNumber(row.phone);
                    return number ? <SmsTextButton key={row.cuisine} numbers={[number]} body={bodyFor(row)} label={`Text ${row.cuisine}`} /> : null;
                  })}
                {contact.phone && <Button size="sm" variant="outline" onClick={() => void copyNumber(contact.phone)}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy number</Button>}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={contact.orders.some((row) => busy === `instruction::${row.id}::${row.cuisine}`)}
                onClick={() => void Promise.all(contact.orders.map(confirmInstructionSent))}
              >
                Mark sent
              </Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={downloadNeedsText}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Download this instruction list
        </Button>
      </Card>
      <Card className="p-5 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-terracotta" />
          <h2 className="font-display text-2xl">Meal texts</h2>
        </div>
        <p className="text-sm text-muted-foreground">
              Every active meal order stays visible. Payment does not remove anyone from the instruction list.
        </p>
        <div className="space-y-2 pt-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <strong>Total orders</strong>
            <div className="flex flex-wrap justify-end gap-2">
              <Badge variant="outline">{totalMeals} plates</Badge>
              <Badge variant="outline">{totalHouseholds} meal preorder contacts</Badge>
              <Badge variant="outline">{totalOrders} cuisine messages</Badge>
            </div>
          </div>
          {reconciliation && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span>Payment status</span>
                <strong>{paidContacts} paid contacts · {reconciliation.totals.paid_meal_quantity} paid plates</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Original meal texts</span>
                <strong>{reconciliation.text_accounting.original.active_households} households · {reconciliation.text_accounting.original.active_lines} active lines</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Payment updates</span>
                <strong>{reconciliation.text_accounting.payment_update.active_households} households · {reconciliation.text_accounting.payment_update.active_lines} active lines</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Still needs payment update</span>
                <Badge variant={needsTextCount === 0 ? "outline" : "destructive"}>{pendingContacts} contacts · {needsTextCount} cuisine messages</Badge>
              </div>
              <Badge variant={reconciliation.totals.reconciles ? "outline" : "destructive"}>
                {reconciliation.totals.reconciles
                  ? `All ${reconciliation.totals.message_units} order lines reconcile`
                  : "Accounting mismatch — review required"}
              </Badge>
              {!reconciliation.totals.plates_reconcile && (
                <Badge variant="destructive">Plate mismatch — review required</Badge>
              )}
            </>
          )}
        </div>

        {reconciliation && (
          <p className="text-xs text-muted-foreground">
            {needsTextCount === 0
              ? "All real meal orders are accounted for; no payment texts remain outstanding. "
              : `${needsTextCount} meal order${needsTextCount === 1 ? "" : "s"} still need the payment text. `}
            {readAtUtc(reconciliation.generated_at)}.
          </p>
        )}

        <div className="pt-1">
          <Button size="sm" variant="outline" onClick={downloadPending}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download instruction list (CSV)
          </Button>
        </div>
      </Card>

      {reconciliation && (
        <Card id="text-mark-accounting" className="p-5 space-y-4">
          <div>
            <h2 className="font-display text-2xl">Text-mark accounting</h2>
            <p className="text-sm text-muted-foreground">
              People are counted once even when they ordered from multiple restaurants. Cuisine lines show the separate texts required for those orders.
            </p>
          </div>
          <div className="divide-y divide-border rounded-md border border-border">
            {reconciliation.text_accounting.actors.map((actor) => (
              <div key={actor.actor_id ?? "historical"} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="font-medium">{actor.actor_name}</span>
                <span className="text-right text-muted-foreground">
                  {actor.payment_update_households} people · {actor.payment_update_lines} payment-update cuisine lines
                  {actor.original_lines > 0 && (
                    <><br />{actor.original_households} people · {actor.original_lines} original cuisine lines</>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            The append-only history retains {reconciliation.text_accounting.original.retained_events} original-text events and {reconciliation.text_accounting.payment_update.retained_events} payment-update events, including {reconciliation.text_accounting.original.historical_deletes} original reversals and {reconciliation.text_accounting.payment_update.historical_deletes} payment-update reversals. They are never silently deleted or counted as current sends after reversal.
          </p>
        </Card>
      )}

      {reconciliation && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-terracotta" />
            <h2 className="font-display text-2xl">Committee meal-order audit</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Every committee member remains visible, including those with no meal preorder stored.
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            <Badge variant="outline">{reconciliation.committee_totals.members} members</Badge>
            <Badge variant="outline">{reconciliation.committee_totals.active_orderers} ordered</Badge>
            <Badge variant="outline">{reconciliation.committee_totals.no_order} no order stored</Badge>
            <Badge variant="outline">{reconciliation.committee_totals.order_lines} order lines</Badge>
            <Badge variant="outline">{reconciliation.committee_totals.plates} plates</Badge>
          </div>
          <div className="divide-y divide-border rounded-md border border-border">
            {reconciliation.committee_orders.map((member) => (
              <div key={member.invitation_id} className="p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.phone || "No phone"}</p>
                  </div>
                  <Badge variant={member.status === "active_order" ? "outline" : "secondary"}>
                    {member.status === "active_order" ? `${member.plates} plates` : "No meal order stored"}
                  </Badge>
                </div>
                {member.selections && <p className="mt-2 text-xs text-muted-foreground">{member.selections}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Send yourself the exact guest message. Records nothing. */}
      <MealTextSelfTest restaurants={restaurants} zelleTemplate={zelleTemplate} self={self} />



      <Card className="p-5 space-y-3">
        <p className="font-medium">Restaurant name and phone number</p>
        <div className="space-y-3">
          {restaurants.map((r) => (
            <div key={r.id} className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-terracotta" />
                  {r.name}
                </span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Ready to text
                  <Switch
                    checked={r.order_ready}
                    onCheckedChange={(v) => void updateContact(r, r.phone ?? "", v)}
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  value={r.phone ?? ""}
                  placeholder="Restaurant phone number"
                  inputMode="tel"
                  onChange={(e) =>
                    setRestaurants((prev) =>
                      prev.map((x) => (x.id === r.id ? { ...x, phone: e.target.value } : x)),
                    )
                  }
                  onBlur={(e) => void updateContact(r, e.target.value, r.order_ready)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  value={r.website ?? ""}
                  placeholder="Restaurant website (optional)"
                  inputMode="url"
                  onChange={(e) =>
                    setRestaurants((prev) =>
                      prev.map((x) => (x.id === r.id ? { ...x, website: e.target.value } : x)),
                    )
                  }
                  onBlur={(e) =>
                    void updateContact(r, r.phone ?? "", r.order_ready, e.target.value)
                  }
                />
              </div>
              {!r.phone?.trim() && (
                <p className="text-xs text-brand-red">
                  Add this number before texting — the message needs it.
                </p>
              )}

            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="font-medium">Payment update wording</p>
            <p className="text-xs" aria-live="polite">
              {tplDirty ? (
                <span className="text-brand-red font-medium">
                  Unsaved changes — tap “Save wording”
                </span>
              ) : tplSavedAt ? (
                <span className="text-muted-foreground">
                  Saved {new Date(tplSavedAt).toISOString().slice(11, 16)} UTC
                </span>
              ) : (
                <span className="text-muted-foreground">
                  This is the exact message the Text buttons send.
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                setZelleTemplate(DEFAULT_ZELLE_UPDATE_TEMPLATE);
                setTplDirty(true);
              }}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
            <Button
              size="sm"
              disabled={savingTpl}
              onClick={async () => {
                setSavingTpl(true);
                setTplError(null);
                try {
                  await saveTemplate({
                    data: { template: zelleTemplate, kind: "zelle" as const },
                  });
                  // Read the saved wording back so "Saved" can never be a guess.
                  const res = await load({ data: {} as never });
                  if (res.zelleTemplate !== zelleTemplate) {
                    throw new Error("The database still has different wording. Please try again.");
                  }
                  setTplDirty(false);
                  setTplSavedAt(new Date().toISOString());
                  toast.success("Wording saved — this is what guests will receive");
                } catch (e) {
                  setTplError(getErrorMessage(e));
                  toast.error("Couldn't save", { description: getErrorMessage(e) });
                } finally {
                  setSavingTpl(false);
                }
              }}
            >
              {savingTpl ? "Saving…" : "Save wording"}
            </Button>
          </div>
        </div>
        <Textarea
          value={zelleTemplate}
          onChange={(e) => {
            setZelleTemplate(e.target.value);
            setTplDirty(true);
          }}
          rows={9}
          className="font-mono text-sm"
        />
        {tplError && <p className="text-xs text-brand-red">{tplError}</p>}

        <p className="text-xs text-muted-foreground">
          Placeholders: <code>{"{first_name}"}</code>, <code>{"{restaurant_name}"}</code>,{" "}
          <code>{"{restaurant_cuisine}"}</code>, <code>{"{restaurant_phone}"}</code>,{" "}
          <code>{"{restaurant_website}"}</code>, <code>{"{order}"}</code>,{" "}
          <code>{"{payment_options}"}</code>, <code>{"{restaurant_zelle}"}</code>,{" "}
          <code>{"{zelle_line}"}</code>, <code>{"{venmo_line}"}</code>,{" "}
          <code>{"{online_prices}"}</code>, <code>{"{meal_choices}"}</code>,{" "}
          <code>{"{pay_sentence}"}</code>, <code>{"{meal_photos}"}</code>,{" "}
          <code>{"{zelle_qr_link}"}</code>.


        </p>

      </Card>

      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Show meal orders</p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label="Filter meal orders by text status">
            <Button
              size="sm"
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
            >
              All ({totalOrders})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "needs" ? "default" : "outline"}
              onClick={() => setStatusFilter("needs")}
            >
              Needs text ({needsTextCount})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "sent" ? "default" : "outline"}
              onClick={() => setStatusFilter("sent")}
            >
              Text sent ({sentCount})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "paid" ? "default" : "outline"}
              onClick={() => setStatusFilter("paid")}
            >
              Paid — instructions still required until confirmed ({paidCount})
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="inviter-filter" className="text-sm text-muted-foreground">
            Committee member
          </label>
          <select
            id="inviter-filter"
            value={inviterFilter}
            onChange={(e) => setInviterFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="all">Everyone</option>
            {inviterOptions.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count} pending)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading meal orders…
        </div>
      )}

      {!loading && groups.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No cultural meal pre-orders yet.
        </Card>
      )}

      {groups.map(([cuisine, list]) => {
        const r = restaurantFor(cuisine);
        const onHold = r ? !r.order_ready : false;
        const kariMock = kariMockByCuisine.get(cuisine);
        const visible = list
          .filter((x) => {
            const evidenceConfirmed = confirmedEvidenceKeys.has(`${x.id}::${x.cuisine}`);
            if (statusFilter === "needs") return !evidenceConfirmed;
            if (statusFilter === "sent") return evidenceConfirmed;
            if (statusFilter === "paid") return isPaidState(x.state);
            return true;
          })
          .filter((x) => (inviterFilter === "all" ? true : x.inviter === inviterFilter));
        return (
          <Card key={cuisine} className="overflow-hidden">
            <div className="p-4 border-b border-border space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-xl">
                  {cuisine === "Myanmar" ? "Myanmar (Burmese)" : cuisine}
                </h3>
                <Badge variant="outline">{list.length} meal contacts</Badge>
                <Badge variant="outline">
                  {list.reduce((s, x) => s + x.qty, 0)} meals
                </Badge>
                {onHold && <Badge className="bg-ink text-cream">Hold — not ready to text</Badge>}
              </div>
              {onHold && (
                <p className="text-xs text-muted-foreground">
                  Turn on “Ready to text” above when this restaurant is taking orders.
                </p>
              )}
            </div>


            <div className="divide-y divide-border">
              {kariMock && statusFilter === "all" && inviterFilter === "all" && (() => {
                const mockBody = bodyFor(kariMock);
                const mockNumber = smsNumber(kariMock.phone);
                return (
                  <div className="p-4 space-y-2 bg-muted/30">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">Kari Gray</span>
                      <Badge variant="outline" className="text-[10px]">
                        {orderText(kariMock.qty, kariMock.cuisine)}
                      </Badge>
                      <Badge className="bg-terracotta text-cream hover:bg-terracotta text-[10px]">
                        Mock message to myself — nothing is recorded
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">808-278-7562</p>
                    <div className="flex flex-wrap gap-2">
                      {mockNumber && (
                        <SmsTextButton
                          numbers={[mockNumber]}
                          body={mockBody}
                          label="Text Kari (mock)"
                        />
                      )}
                      <Button size="sm" variant="outline" onClick={() => void copy(mockBody)}>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy mock message
                      </Button>
                    </div>
                  </div>
                );
              })()}
              {visible.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Nobody left in this list.</p>
              )}
              {visible.map((row) => {
                const body = bodyFor(row);
                const num = smsNumber(row.phone);
                return (
                  <div key={`${row.id}-${row.cuisine}`} className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {orderText(row.qty, row.cuisine)}
                      </Badge>
                      {isPaidState(row.state) ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                          {row.state === "paid_confirmed"
                            ? "Paid — restaurant confirmed · instructions still required"
                            : "Paid — reported · instructions still required"}
                        </Badge>
                      ) : confirmedEvidenceKeys.has(`${row.id}::${row.cuisine}`) ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                          Physical send confirmed{" "}
                          {row.zelle_sent_at ? new Date(row.zelle_sent_at).toLocaleDateString() : "reviewed today"} ·{" "}
                          {cuisineLabel(row.cuisine)}
                          {row.sent_by ? ` · by ${row.sent_by}` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-400 text-amber-700 text-[10px]">
                          Payment update not sent yet · {cuisineLabel(row.cuisine)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.phone || "No phone on file"} · {row.inviter}
                    </p>
                    {row.sent_at && (
                      <p className="text-xs text-muted-foreground">
                        Earlier meal message sent {new Date(row.sent_at).toLocaleDateString()} — reference only.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {num && !onHold && !confirmedEvidenceKeys.has(`${row.id}::${row.cuisine}`) && (
                        <SmsTextButton
                          numbers={[num]}
                          body={body}
                          label={`Text ${row.name.split(/\s+/)[0]}`}
                        />
                      )}
                      {!num && (
                        <span className="text-xs font-medium text-brand-red">No usable phone number</span>
                      )}
                      <Button size="sm" variant="outline" onClick={() => void copy(body)}>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                      </Button>
                      {confirmedEvidenceKeys.has(`${row.id}::${row.cuisine}`) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === `${row.id}::${row.cuisine}`}
                          onClick={() => void setSent(row, false)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                          Payment update sent · Undo
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === `${row.id}::${row.cuisine}`}
                          onClick={() => void setSent(row, true)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          Check here after you text
                        </Button>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{preview?.title ?? "Message preview"}</DialogTitle>
            <DialogDescription>
              Read-only preview of the exact text. Nothing is sent or recorded from here.
            </DialogDescription>
          </DialogHeader>
          <Textarea readOnly value={preview?.body ?? ""} rows={12} className="text-xs" />
          <Button size="sm" variant="outline" onClick={() => void copy(preview?.body ?? "")}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy message
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
