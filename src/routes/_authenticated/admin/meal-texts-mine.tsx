import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, Loader2, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/async-safety";
import { downloadTextFile } from "@/lib/download-file";
import { ExportFallbackDialog } from "@/components/export-fallback-dialog";
import { SmsTextButton } from "@/components/sms-text-button";
import { OpenOnSiteBanner } from "@/components/open-on-site-banner";
import {
  cuisineLabel,
  matchRestaurant,
  paymentLines,
  mealOrderText,
  renderMealTemplate,
  mealPhotosLine,
  smsNumber,
} from "@/lib/meal-text-message";


import {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  DEFAULT_ZELLE_UPDATE_TEMPLATE,
  type MealRestaurant,
} from "@/lib/meal-text-defaults";
import {
  getMyMealTexts,
  markMyMealTextSent,
  markMyZelleTextSent,
  type CommitteeMealTextRow,
} from "@/lib/committee-meal-texts.functions";

export const Route = createFileRoute("/_authenticated/admin/meal-texts-mine")({
  head: () => ({
    meta: [
      { title: "My meal texts — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Send your own guests the restaurant name and phone number for the cultural meal they pre-ordered, one tap at a time from your phone.",
      },
      { property: "og:title", content: "My meal texts" },
      {
        property: "og:description",
        content: "One-tap restaurant texts for the guests you personally invited.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyMealTextsPage,
});

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function MyMealTextsPage() {
  const load = useServerFn(getMyMealTexts);
  const markSent = useServerFn(markMyMealTextSent);
  const markZelle = useServerFn(markMyZelleTextSent);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CommitteeMealTextRow[]>([]);
  const [restaurants, setRestaurants] = useState<MealRestaurant[]>([]);
  const [template, setTemplate] = useState(DEFAULT_MEAL_TEXT_TEMPLATE);
  const [zelleTemplate, setZelleTemplate] = useState(DEFAULT_ZELLE_UPDATE_TEMPLATE);
  // "zelle" = the follow-up Zelle/Venmo text for guests already texted once.
  const [mode, setMode] = useState<"meal" | "zelle">("zelle");
  const [isAdmin, setIsAdmin] = useState(false);
  const [committee, setCommittee] = useState<Array<{ id: string; name: string }>>([]);
  const [actingFor, setActingFor] = useState<string | null>(null);
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [fallback, setFallback] = useState<{ filename: string; text: string } | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const refresh = async (inviterId: string | null) => {
    setLoading(true);
    try {
      const res = await load({ data: { actingForInviterId: inviterId } });
      setRows(res.rows);
      setRestaurants(res.restaurants);
      setTemplate(res.template);
      setZelleTemplate(res.zelleTemplate);
      setIsAdmin(res.isAdmin);
      setCommittee(res.committee);
    } catch (e) {
      toast.error("Couldn't load your guests' meal orders", { description: getErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh(actingFor);
  }, [actingFor]);

  const isZelle = mode === "zelle";
  const modeRows = useMemo(
    () => (isZelle ? rows.filter((r) => r.sent_at) : rows),
    [rows, isZelle],
  );

  const groups = useMemo(() => {
    const map = new Map<string, CommitteeMealTextRow[]>();
    for (const r of modeRows) {
      if (!map.has(r.cuisine)) map.set(r.cuisine, []);
      map.get(r.cuisine)!.push(r);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [modeRows]);

  const restaurantFor = (cuisine: string) => matchRestaurant(restaurants, cuisine);

  const bodyFor = (row: CommitteeMealTextRow) => {
    const r = restaurantFor(row.cuisine);
    const pay = paymentLines(r);
    return renderMealTemplate(isZelle ? zelleTemplate : template, {
      ...pay,
      firstName: row.name.split(/\s+/)[0] ?? row.name,
      restaurantName: r?.name ?? row.cuisine,
      restaurantCuisine: cuisineLabel(r?.cuisine?.trim() || row.cuisine),
      restaurantPhone: r?.phone?.trim() || "[ask the admin for the restaurant's phone number]",
      restaurantWebsite: r?.website?.trim() || "",
      order: mealOrderText(row.qty, row.cuisine),
      mealPhotos: mealPhotosLine(row.cuisine),
    });
  };

  const setSent = async (row: CommitteeMealTextRow, sent: boolean) => {
    const key = `${row.id}::${row.cuisine}`;
    setBusy(key);
    try {
      const data = {
        marks: [{ preorderId: row.id, cuisine: row.cuisine }],
        sent,
        actingForInviterId: actingFor,
      };
      const res = isZelle ? await markZelle({ data }) : await markSent({ data });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id && r.cuisine === row.cuisine
            ? isZelle
              ? { ...r, zelle_sent_at: res.sentAt }
              : { ...r, sent_at: res.sentAt }
            : r,
        ),
      );
    } catch (e) {
      toast.error("Couldn't update the texted mark", { description: getErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  };


  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied — paste it into a text");
      return true;
    } catch (e) {
      toast.error("Couldn't copy", { description: getErrorMessage(e) });
      return false;
    }
  };

  const exportSheet = (cuisine: string, list: CommitteeMealTextRow[]) => {
    const header = ["Guest", "Phone", "Cuisine", "Meals", "Event"].join(",");
    const body = list
      .map((r) =>
        [
          escapeCsv(r.name),
          escapeCsv(r.phone),
          escapeCsv(cuisineLabel(r.cuisine)),
          r.qty,
          escapeCsv("A Taste of Special Conventions — Aug 30, 2026"),
        ].join(","),
      )
      .join("\n");
    const text = `${header}\n${body}\n`;
    const filename = `${cuisine.toLowerCase()}-meal-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    const result = downloadTextFile(filename, text);
    if (!result.ok) {
      setFallback({ filename, text });
      setFallbackOpen(true);
    } else {
      toast.success(`Downloaded ${filename}`);
    }
  };

  const totalOrders = modeRows.length;
  const totalPeople = new Set(modeRows.map((r) => r.id)).size;
  const totalMeals = modeRows.reduce((s, r) => s + r.qty, 0);
  const sentCount = modeRows.filter((r) => (isZelle ? r.zelle_sent_at : r.sent_at)).length;

  return (
    <div className="space-y-5">
      <OpenOnSiteBanner />
      <Card className="p-5 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-terracotta" />
          <h1 className="font-display text-2xl">My meal texts</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          These are the guests <strong>you</strong> brought who pre-ordered a cultural meal. Tap
          <strong> Text</strong> and your own Messages app opens with the restaurant's name, phone
          number and their order already written — you just press send. Nothing is sent
          automatically.
        </p>
        <p className="text-sm text-muted-foreground">
          Each restaurant needs its own text. If a guest ordered from two or three restaurants,
          they appear once per restaurant and each one is checked off separately.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant={isZelle ? "outline" : "default"} onClick={() => setMode("meal")}>
            Original meal message
          </Button>
          <Button size="sm" variant={isZelle ? "default" : "outline"} onClick={() => setMode("zelle")}>
            New payment update
          </Button>
        </div>
        {isZelle && (
          <p className="text-sm text-muted-foreground">
            This new payment-update list starts at zero sent. Send the update, then explicitly check
            it off; opening or copying a message never marks it sent.
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{totalPeople} guests</Badge>
          <Badge variant="outline">{totalOrders} restaurant texts</Badge>
          <Badge variant="outline">{totalMeals} meals</Badge>
          <Badge variant="outline">
            {sentCount} {isZelle ? "sent the new payment update" : "sent the original meal message"}
          </Badge>
          <Badge variant="outline">{totalOrders - sentCount} to go</Badge>
        </div>
      </Card>


      {isAdmin && committee.length > 0 && (
        <Card className="p-4 space-y-2">
          <label htmlFor="acting-for" className="flex items-center gap-2 font-medium text-sm">
            <Users className="w-4 h-4 text-terracotta" /> Acting for
          </label>
          <select
            id="acting-for"
            className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
            value={actingFor ?? ""}
            onChange={(e) => setActingFor(e.target.value || null)}
          >
            <option value="">Myself (my own guests)</option>
            {committee.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Pick a committee member to send their guests' texts on their behalf.
          </p>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Switch checked={onlyUnsent} onCheckedChange={setOnlyUnsent} id="only-unsent-mine" />
        <label htmlFor="only-unsent-mine" className="text-sm">
          {isZelle
            ? "Show only the guests who haven't had the new payment update"
            : "Show only the guests I haven't texted yet"}
        </label>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your guests' meal orders…
        </div>
      )}

      {!loading && groups.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          None of your guests have pre-ordered a cultural meal yet.
        </Card>
      )}

      {groups.map(([cuisine, list]) => {
        const r = restaurantFor(cuisine);
        const onHold = r ? !r.order_ready : false;
        const visible = onlyUnsent
          ? list.filter((x) => !(isZelle ? x.zelle_sent_at : x.sent_at))
          : list;
        return (
          <Card key={cuisine} className="overflow-hidden">
            <div className="p-4 border-b border-border space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl">{cuisineLabel(cuisine)}</h2>
                <Badge variant="outline">{list.length} guests</Badge>
                <Badge variant="outline">{list.reduce((s, x) => s + x.qty, 0)} meals</Badge>
                {onHold && <Badge className="bg-ink text-cream">Hold — not ready to text</Badge>}
              </div>
              {r && (
                <p className="text-xs text-muted-foreground">
                  {r.name}
                  {r.phone ? ` · ${r.phone}` : " · no phone on file yet"}
                  {r.website ? ` · ${r.website}` : ""}
                </p>
              )}
              {onHold && (
                <p className="text-xs text-muted-foreground">
                  This restaurant isn't taking orders yet — hold off on texting these guests.
                </p>
              )}
              <Button size="sm" variant="ghost" onClick={() => exportSheet(cuisine, list)}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Restaurant sheet
              </Button>
            </div>

            <div className="divide-y divide-border">
              {visible.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Nobody left in this list.</p>
              )}
              {visible.map((row) => {
                const body = bodyFor(row);
                const num = smsNumber(row.phone);
                return (
                  <div
                    key={`${row.id}-${row.cuisine}`}
                    className={`p-4 space-y-2 ${(isZelle ? row.zelle_sent_at : row.sent_at) ? "bg-emerald-50/60" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {mealOrderText(row.qty, row.cuisine)}
                      </Badge>
                      {(isZelle ? row.zelle_sent_at : row.sent_at) ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                          {isZelle ? "New payment update sent" : "Original meal message sent"}{" "}
                          {new Date((isZelle ? row.zelle_sent_at : row.sent_at)!).toLocaleDateString()}{" "}
                          · {cuisineLabel(row.cuisine)}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-amber-700 text-[10px]"
                        >
                           {isZelle ? "No new payment update yet for" : "No original meal message yet for"}{" "}
                          {cuisineLabel(row.cuisine)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.phone || "No phone on file"}
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
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy message
                      </Button>
                      {(isZelle ? row.zelle_sent_at : row.sent_at) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === `${row.id}::${row.cuisine}`}
                          onClick={() => void setSent(row, false)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                           {isZelle ? "Payment update sent · Undo" : "Original message sent · Undo"}
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

      {fallback && (
        <ExportFallbackDialog
          open={fallbackOpen}
          onOpenChange={setFallbackOpen}
          filename={fallback.filename}
          text={fallback.text}
          title="Your restaurant sheet is ready"
        />
      )}
    </div>
  );
}
