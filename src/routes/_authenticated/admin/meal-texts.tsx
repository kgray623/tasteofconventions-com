import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, Globe, Loader2, MessageSquare, Phone, RotateCcw, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MealCountBadges } from "@/components/meal-counts";
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
import { OpenOnSiteBanner } from "@/components/open-on-site-banner";
import { isPaidState } from "@/lib/meal-communication";

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

  const refresh = async (opts?: { keepWording?: boolean }) => {
    setLoading(true);
    try {
      const res = await load({ data: {} as never });
      setRestaurants(res.restaurants);
      setRows(res.rows);
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

  // Everyone who ordered a meal needs the payment update text, except the
  // guests with a recorded payment (restaurant-confirmed, guest-reported, or
  // committee-recorded). The original-message history is reference only and
  // never filters this queue.
  const modeRows = useMemo(() => rows.filter((r) => !isPaidState(r.state)), [rows]);

  // Paid orders never disappear: they are listed per cuisine as "already paid".
  const paidRows = useMemo(() => rows.filter((r) => isPaidState(r.state)), [rows]);

  // Kari's paid meals stay out of the real queue, but her own saved preorder is
  // available in each cuisine as a non-recording mock text recipient.
  const kariMockByCuisine = useMemo(() => {
    const byCuisine = new Map<string, MealTextRow>();
    for (const row of rows) {
      if (smsNumber(row.phone) === "8082787562" && row.name.trim().toLowerCase() === "kari gray") {
        byCuisine.set(row.cuisine, row);
      }
    }
    return byCuisine;
  }, [rows]);

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
      if (r.zelle_sent_at) continue;
      seen.set(r.inviter, (seen.get(r.inviter) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [modeRows]);


  const downloadPending = () => {
    const pending = modeRows.filter((r) => !r.zelle_sent_at);
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
    const name = `payment-update-pending-${new Date().toISOString().slice(0, 10)}.csv`;
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
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id && r.cuisine === row.cuisine
            ? { ...r, zelle_sent_at: res.sentAt, sent_by: res.sentAt ? "you" : null }
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
  const sentCount = modeRows.filter((r) => r.zelle_sent_at).length;

  return (
    <div className="space-y-6">
      <OpenOnSiteBanner />
      <Card className="p-5 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-terracotta" />
          <h2 className="font-display text-2xl">Meal texts</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Everyone who ordered a meal is in this one queue except guests already recorded as paid.
          Every text opens in your own Messages app; nothing is recorded until you explicitly check
          it after sending, and every mark shows who tapped it.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs text-muted-foreground self-center">In this queue:</span>
          <MealCountBadges plates={totalMeals} households={totalHouseholds} lines={totalOrders} />
          <Badge variant="outline">{sentCount} payment update sent</Badge>
          <Badge variant="outline">{totalOrders - sentCount} still to text</Badge>
          {reconciliation && (
            <Badge variant={reconciliation.totals.reconciles ? "outline" : "destructive"}>
              {reconciliation.totals.message_units} orders = {reconciliation.totals.needs_update} still to text + {reconciliation.totals.update_sent} texted + {reconciliation.totals.paid_confirmed} paid (restaurant) + {reconciliation.totals.paid_reported} paid (reported) + {reconciliation.totals.exceptions} exceptions
            </Badge>
          )}
        </div>

        {reconciliation && (
          <p className="text-xs text-muted-foreground">
            {readAtUtc(reconciliation.generated_at)}.
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
        <div className="flex items-center gap-2">
          <Switch checked={onlyUnsent} onCheckedChange={setOnlyUnsent} id="only-unsent" />
          <label htmlFor="only-unsent" className="text-sm">
            Show only people who still need the payment text
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
        const paidHere = paidRows.filter((x) => x.cuisine === cuisine);
        const kariMock = kariMockByCuisine.get(cuisine);
        const visible = list
          .filter((x) => (onlyUnsent ? !x.zelle_sent_at : true))
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
              {paidHere.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Already paid — no text needed ({paidHere.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {paidHere.map((x) => (
                      <Button
                        key={`${x.id}-paid`}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setPreview({ title: `${x.name} — ${cuisineLabel(x.cuisine)}`, body: bodyFor(x) })}
                      >
                        {x.name} — preview message
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>


            <div className="divide-y divide-border">
              {kariMock && (() => {
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
                            ? "Paid — restaurant confirmed"
                            : "Paid — reported, awaiting confirmation"}
                        </Badge>
                      ) : row.zelle_sent_at ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                          Payment update sent{" "}
                          {new Date(row.zelle_sent_at).toLocaleDateString()} ·{" "}
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
                      {row.zelle_sent_at ? (
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
