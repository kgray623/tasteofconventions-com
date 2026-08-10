import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, Globe, Loader2, MessageSquare, Phone, RotateCcw, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/async-safety";
import { downloadTextFile, openTextInNewTab } from "@/lib/download-file";
import {
  smsNumber,
  cuisineLabel,
  paymentLines,
  renderMealTemplate,
  mealPhotosLine,
} from "@/lib/meal-text-message";
import { SmsTextButton } from "@/components/sms-text-button";
import { OpenOnSiteBanner } from "@/components/open-on-site-banner";

import {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  DEFAULT_ZELLE_UPDATE_TEMPLATE,
  getMealTextData,
  markMealTextSent,
  markZelleTextSent,
  saveMealTextTemplate,
  saveRestaurantContact,
  type MealRestaurant,
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
  const markSent = useServerFn(markMealTextSent);
  const markZelle = useServerFn(markZelleTextSent);

  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<MealRestaurant[]>([]);
  const [rows, setRows] = useState<MealTextRow[]>([]);
  const [template, setTemplate] = useState(DEFAULT_MEAL_TEXT_TEMPLATE);
  const [zelleTemplate, setZelleTemplate] = useState(DEFAULT_ZELLE_UPDATE_TEMPLATE);
  // "meal" = the original restaurant text. "zelle" = the Zelle/Venmo follow-up
  // for guests already texted. The two marks are tracked separately.
  const [mode, setMode] = useState<"meal" | "zelle">("zelle");
  const [savingTpl, setSavingTpl] = useState(false);
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [inviterFilter, setInviterFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<{
    totals: {
      message_units: number;
      meal_quantity: number;
      paid: number;
      paid_confirmed: number;
      paid_reported: number;
      needs_update: number;
      update_sent: number;
      exceptions: number;
      reconciles: boolean;
    };
    generated_at: string;
  } | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await load({ data: {} as never });
      setRestaurants(res.restaurants);
      setRows(res.rows);
      setTemplate(res.template);
      setZelleTemplate(res.zelleTemplate);
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

  // Everyone who ordered a meal needs the payment update text, except the
  // guests with a recorded payment (restaurant-confirmed, guest-reported, or
  // committee-recorded). The original-message history is reference only and
  // never filters this queue.
  const modeRows = useMemo(
    () => (mode === "zelle" ? rows.filter((r) => !isPaidState(r.state)) : rows),
    [rows, mode],
  );

  const groups = useMemo(() => {
    const map = new Map<string, MealTextRow[]>();
    for (const r of modeRows) {
      if (!map.has(r.cuisine)) map.set(r.cuisine, []);
      map.get(r.cuisine)!.push(r);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [modeRows]);

  const inviterOptions = useMemo(() => {
    // Count outstanding restaurant texts (one per guest per cuisine), so this
    // matches the pending numbers on the tracker card exactly.
    const seen = new Map<string, number>();
    for (const r of modeRows) {
      if (mode === "zelle" ? r.zelle_sent_at : r.sent_at) continue;
      seen.set(r.inviter, (seen.get(r.inviter) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [modeRows, mode]);


  const downloadPending = () => {
    const pending = modeRows.filter((r) => (mode === "zelle" ? !r.zelle_sent_at : !r.sent_at));
    if (pending.length === 0) {
      toast.error("Everyone in this list has been texted");
      return;
    }
    const esc = (v: unknown) => {
      const t = String(v ?? "");
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const csv = [
      ["Guest", "Phone", "Cuisine", "Meals", "Committee member", "Notified"].join(","),
      ...pending.map((r) =>
        [r.name, r.phone, r.cuisine, r.qty, r.inviter, "Not yet"].map(esc).join(","),
      ),
    ].join("\n");
    const name = `${mode === "zelle" ? "zelle-update-pending" : "pre-pay-pending"}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
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
    return renderMealTemplate(mode === "zelle" ? zelleTemplate : template, {
      ...pay,
      firstName: row.name.split(/\s+/)[0] ?? row.name,
      restaurantName: r?.name ?? row.cuisine,
      restaurantCuisine: cuisineLabel(r?.cuisine?.trim() || row.cuisine),
      restaurantPhone: r?.phone?.trim() || "[add the restaurant's phone number]",
      restaurantWebsite: r?.website?.trim() || "",
      order: orderText(row.qty, row.cuisine),
      mealPhotos: mealPhotosLine(row.cuisine),
    });
  };

  const setSent = async (row: MealTextRow, sent: boolean) => {
    const key = `${row.id}::${row.cuisine}`;
    setBusy(key);
    try {
      const data = { marks: [{ preorderId: row.id, cuisine: row.cuisine }], sent };
      const res = mode === "zelle" ? await markZelle({ data }) : await markSent({ data });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id && r.cuisine === row.cuisine
            ? mode === "zelle"
              ? { ...r, zelle_sent_at: res.sentAt }
              : { ...r, sent_at: res.sentAt }
            : r,
        ),
      );
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

  const totalOrders = modeRows.length;
  const totalHouseholds = new Set(modeRows.map((r) => r.id)).size;
  const totalMeals = modeRows.reduce((s, r) => s + r.qty, 0);
  const sentCount = modeRows.filter((r) => (mode === "zelle" ? r.zelle_sent_at : r.sent_at)).length;
  const isZelle = mode === "zelle";

  return (
    <div className="space-y-6">
      <OpenOnSiteBanner />
      <Card className="p-5 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-terracotta" />
          <h2 className="font-display text-2xl">Meal texts</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={isZelle ? "outline" : "default"}
            onClick={() => setMode("meal")}
          >
            Original meal message
          </Button>
          <Button
            size="sm"
            variant={isZelle ? "default" : "outline"}
            onClick={() => setMode("zelle")}
          >
            New payment update
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {isZelle
              ? "Everyone who ordered a meal is in this queue except guests the restaurant has recorded as paid. Every text opens in your own Messages app; nothing is recorded until you explicitly check it after sending."
            : "Full history of the original meal message for every order. Reference only — the payment update queue is not filtered by it."}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{totalHouseholds} households</Badge>
          <Badge variant="outline">{totalOrders} restaurant texts</Badge>
          <Badge variant="outline">{totalMeals} meals</Badge>
          <Badge variant="outline">
            {sentCount} {isZelle ? "sent the new payment update" : "sent the original meal message"}
          </Badge>
          <Badge variant="outline">{totalOrders - sentCount} still to text</Badge>
          {reconciliation && (
            <Badge variant={reconciliation.totals.reconciles ? "outline" : "destructive"}>
              {reconciliation.totals.message_units} orders = {reconciliation.totals.needs_update} still to text + {reconciliation.totals.update_sent} texted + {reconciliation.totals.paid} paid + {reconciliation.totals.exceptions} exceptions
            </Badge>
          )}
        </div>

        {reconciliation && (
          <p className="text-xs text-muted-foreground">
            Reconciled from the database {new Date(reconciliation.generated_at).toLocaleString()}.
          </p>
        )}

        <div className="pt-1">
          <Button size="sm" variant="outline" onClick={downloadPending}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download pending list (CSV)
          </Button>
        </div>
      </Card>

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
          <p className="font-medium">{isZelle ? "Zelle update wording" : "Message wording"}</p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() =>
                isZelle
                  ? setZelleTemplate(DEFAULT_ZELLE_UPDATE_TEMPLATE)
                  : setTemplate(DEFAULT_MEAL_TEXT_TEMPLATE)
              }
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
            <Button
              size="sm"
              disabled={savingTpl}
              onClick={async () => {
                setSavingTpl(true);
                try {
                  await saveTemplate({
                    data: isZelle
                      ? { template: zelleTemplate, kind: "zelle" as const }
                      : { template, kind: "meal" as const },
                  });
                  toast.success("Wording saved");
                } catch (e) {
                  toast.error("Couldn't save", { description: getErrorMessage(e) });
                } finally {
                  setSavingTpl(false);
                }
              }}
            >
              Save wording
            </Button>
          </div>
        </div>
        <Textarea
          value={isZelle ? zelleTemplate : template}
          onChange={(e) => (isZelle ? setZelleTemplate(e.target.value) : setTemplate(e.target.value))}
          rows={9}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Placeholders: <code>{"{first_name}"}</code>, <code>{"{restaurant_name}"}</code>,{" "}
          <code>{"{restaurant_cuisine}"}</code>, <code>{"{restaurant_phone}"}</code>,{" "}
          <code>{"{restaurant_website}"}</code>, <code>{"{order}"}</code>,{" "}
          <code>{"{payment_options}"}</code>, <code>{"{restaurant_zelle}"}</code>,{" "}
          <code>{"{zelle_line}"}</code>, <code>{"{venmo_line}"}</code>,{" "}
          <code>{"{online_prices}"}</code>, <code>{"{meal_choices}"}</code>,{" "}
          <code>{"{pay_sentence}"}</code>, <code>{"{meal_photos}"}</code>.

        </p>

      </Card>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Switch checked={onlyUnsent} onCheckedChange={setOnlyUnsent} id="only-unsent" />
          <label htmlFor="only-unsent" className="text-sm">
            {isZelle
              ? "Show only people who haven't had the new payment update"
              : "Show only people I haven't texted yet"}
          </label>
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
        const visible = list
          .filter((x) => (onlyUnsent ? !(isZelle ? x.zelle_sent_at : x.sent_at) : true))
          .filter((x) => (inviterFilter === "all" ? true : x.inviter === inviterFilter));
        return (
          <Card key={cuisine} className="overflow-hidden">
            <div className="p-4 border-b border-border space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-xl">
                  {cuisine === "Myanmar" ? "Myanmar (Burmese)" : cuisine}
                </h3>
                <Badge variant="outline">{list.length} households</Badge>
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
                      {(isZelle ? row.zelle_sent_at : row.sent_at) ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                          {isZelle ? "Zelle update sent" : "Texted"}{" "}
                          {new Date((isZelle ? row.zelle_sent_at : row.sent_at)!).toLocaleDateString()}{" "}
                          · {cuisineLabel(row.cuisine)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-400 text-amber-700 text-[10px]">
                          {isZelle ? "No Zelle update yet for" : "Not texted about"}{" "}
                          {cuisineLabel(row.cuisine)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.phone || "No phone on file"} · {row.inviter}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {num && !onHold && (
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
                      {(isZelle ? row.zelle_sent_at : row.sent_at) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === `${row.id}::${row.cuisine}`}
                          onClick={() => void setSent(row, false)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                          {isZelle ? "Zelle update sent · Undo" : "Texted · Undo"}
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
    </div>
  );
}
