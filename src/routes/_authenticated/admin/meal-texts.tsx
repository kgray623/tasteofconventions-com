import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Globe, Loader2, MessageSquare, Phone, RotateCcw, Send, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/async-safety";
import { openSms } from "@/lib/meal-text-message";

import {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  getMealTextData,
  markMealTextSent,
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

const CHUNK = 20;

const digits = (s: string) => (s ?? "").replace(/\D/g, "");
const smsNumber = (s: string) => {
  const d = digits(s);
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d ? `+${d}` : "";
};

function smsHref(numbers: string[], body: string) {
  const to = numbers.filter(Boolean).join(",");
  return `sms:${to}?&body=${encodeURIComponent(body)}`;
}

function renderTemplate(
  tpl: string,
  ctx: {
    firstName: string;
    restaurantName: string;
    restaurantPhone: string;
    restaurantWebsite: string;
    order: string;
  },
) {
  return tpl
    .replaceAll("{first_name}", ctx.firstName)
    .replaceAll("{restaurant_name}", ctx.restaurantName)
    .replaceAll("{restaurant_phone}", ctx.restaurantPhone)
    .replaceAll("{restaurant_website}", ctx.restaurantWebsite)
    .replaceAll("{order}", ctx.order)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


const orderText = (qty: number, cuisine: string) =>
  `${qty} ${cuisine} meal${qty === 1 ? "" : "s"}`;

function MealTextsPage() {
  const load = useServerFn(getMealTextData);
  const saveContact = useServerFn(saveRestaurantContact);
  const saveTemplate = useServerFn(saveMealTextTemplate);
  const markSent = useServerFn(markMealTextSent);

  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<MealRestaurant[]>([]);
  const [rows, setRows] = useState<MealTextRow[]>([]);
  const [template, setTemplate] = useState(DEFAULT_MEAL_TEXT_TEMPLATE);
  const [savingTpl, setSavingTpl] = useState(false);
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await load({ data: {} as never });
      setRestaurants(res.restaurants);
      setRows(res.rows);
      setTemplate(res.template);
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

  const groups = useMemo(() => {
    const map = new Map<string, MealTextRow[]>();
    for (const r of rows) {
      if (!map.has(r.cuisine)) map.set(r.cuisine, []);
      map.get(r.cuisine)!.push(r);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const bodyFor = (row: MealTextRow) => {
    const r = restaurantFor(row.cuisine);
    return renderTemplate(template, {
      firstName: row.name.split(/\s+/)[0] ?? row.name,
      restaurantName: r?.name ?? row.cuisine,
      restaurantPhone: r?.phone?.trim() || "[add the restaurant's phone number]",
      restaurantWebsite: r?.website?.trim() || "",
      order: orderText(row.qty, row.cuisine),
    });
  };

  const groupBody = (cuisine: string) => {
    const r = restaurantFor(cuisine);
    return renderTemplate(template, {
      firstName: "friends",
      restaurantName: r?.name ?? cuisine,
      restaurantPhone: r?.phone?.trim() || "[add the restaurant's phone number]",
      restaurantWebsite: r?.website?.trim() || "",
      order: `your ${cuisine} meal order`,
    });
  };


  const setSent = async (ids: string[], sent: boolean) => {
    const unique = [...new Set(ids)];
    setBusy(unique.join(","));
    try {
      const res = await markSent({ data: { ids: unique, sent } });
      setRows((prev) =>
        prev.map((r) => (unique.includes(r.id) ? { ...r, sent_at: res.sentAt } : r)),
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
    } catch (e) {
      toast.error("Couldn't copy", { description: getErrorMessage(e) });
    }
  };

  const totalPeople = rows.length;
  const totalMeals = rows.reduce((s, r) => s + r.qty, 0);
  const sentCount = rows.filter((r) => r.sent_at).length;

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-terracotta" />
          <h2 className="font-display text-2xl">Meal texts</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Every text opens in your own Messages app with the wording already written — you just press
          send. Nothing is sent automatically.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{totalPeople} households</Badge>
          <Badge variant="outline">{totalMeals} meals</Badge>
          <Badge variant="outline">{sentCount} texted</Badge>
          <Badge variant="outline">{totalPeople - sentCount} still to text</Badge>
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
          <p className="font-medium">Message wording</p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setTemplate(DEFAULT_MEAL_TEXT_TEMPLATE)}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
            <Button
              size="sm"
              disabled={savingTpl}
              onClick={async () => {
                setSavingTpl(true);
                try {
                  await saveTemplate({ data: { template } });
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
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={9}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Placeholders: <code>{"{first_name}"}</code>, <code>{"{restaurant_name}"}</code>,{" "}
          <code>{"{restaurant_phone}"}</code>, <code>{"{restaurant_website}"}</code>,{" "}
          <code>{"{order}"}</code>.
        </p>

      </Card>

      <div className="flex items-center gap-2">
        <Switch checked={onlyUnsent} onCheckedChange={setOnlyUnsent} id="only-unsent" />
        <label htmlFor="only-unsent" className="text-sm">
          Show only people I haven't texted yet
        </label>
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
        const visible = onlyUnsent ? list.filter((x) => !x.sent_at) : list;
        const numbers = list.filter((x) => !x.sent_at).map((x) => smsNumber(x.phone)).filter(Boolean);
        const chunks: string[][] = [];
        for (let i = 0; i < numbers.length; i += CHUNK) chunks.push(numbers.slice(i, i + CHUNK));

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
              {onHold ? (
                <p className="text-xs text-muted-foreground">
                  Turn on “Ready to text” above when this restaurant is taking orders.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {chunks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Everyone here has been texted.</p>
                  ) : (
                    chunks.map((chunk, i) => (
                      <Button
                        key={i}
                        size="sm"
                        className="bg-terracotta text-cream hover:bg-terracotta/90"
                        asChild
                        onClick={() =>
                          void setSent(
                            list
                              .filter((x) => !x.sent_at && chunk.includes(smsNumber(x.phone)))
                              .map((x) => x.id),
                            true,
                          )
                        }
                      >
                        <a href={smsHref(chunk, groupBody(cuisine))}>
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Text group {chunks.length > 1 ? `${i + 1} of ${chunks.length}` : ""} (
                          {chunk.length})
                        </a>
                      </Button>
                    ))
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void copy(groupBody(cuisine))}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy group message
                  </Button>
                </div>
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
                      {row.sent_at ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                          Texted {new Date(row.sent_at).toLocaleDateString()}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-400 text-amber-700 text-[10px]">
                          Not texted
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{row.phone || "No phone on file"}</p>
                    <div className="flex flex-wrap gap-2">
                      {num && !onHold && (
                        <Button
                          size="sm"
                          className="bg-pink-500 text-white hover:bg-pink-600"
                          asChild
                          onClick={() => void setSent([row.id], true)}
                        >
                          <a href={smsHref([num], body)}>
                            <Send className="w-3.5 h-3.5 mr-1.5" /> Text {row.name.split(/\s+/)[0]}
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => void copy(body)}>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy?.includes(row.id)}
                        onClick={() => void setSent([row.id], !row.sent_at)}
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        {row.sent_at ? "Mark not texted" : "Mark texted"}
                      </Button>
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
