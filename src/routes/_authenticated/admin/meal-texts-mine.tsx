import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, Loader2, MessageSquare, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/async-safety";
import { downloadTextFile } from "@/lib/download-file";
import { ExportFallbackDialog } from "@/components/export-fallback-dialog";
import {
  chunkNumbers,
  cuisineLabel,
  matchRestaurant,
  mealOrderText,
  renderMealTemplate,
  smsHref,
  smsNumber,
} from "@/lib/meal-text-message";
import { DEFAULT_MEAL_TEXT_TEMPLATE, type MealRestaurant } from "@/lib/meal-text-defaults";
import {
  getMyMealTexts,
  markMyMealTextSent,
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

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CommitteeMealTextRow[]>([]);
  const [restaurants, setRestaurants] = useState<MealRestaurant[]>([]);
  const [template, setTemplate] = useState(DEFAULT_MEAL_TEXT_TEMPLATE);
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

  const groups = useMemo(() => {
    const map = new Map<string, CommitteeMealTextRow[]>();
    for (const r of rows) {
      if (!map.has(r.cuisine)) map.set(r.cuisine, []);
      map.get(r.cuisine)!.push(r);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const restaurantFor = (cuisine: string) => matchRestaurant(restaurants, cuisine);

  const bodyFor = (row: CommitteeMealTextRow) => {
    const r = restaurantFor(row.cuisine);
    return renderMealTemplate(template, {
      firstName: row.name.split(/\s+/)[0] ?? row.name,
      restaurantName: r?.name ?? row.cuisine,
      restaurantPhone: r?.phone?.trim() || "[ask the admin for the restaurant's phone number]",
      restaurantWebsite: r?.website?.trim() || "",
      order: mealOrderText(row.qty, row.cuisine),
    });
  };

  const groupBody = (cuisine: string) => {
    const r = restaurantFor(cuisine);
    return renderMealTemplate(template, {
      firstName: "friends",
      restaurantName: r?.name ?? cuisine,
      restaurantPhone: r?.phone?.trim() || "[ask the admin for the restaurant's phone number]",
      restaurantWebsite: r?.website?.trim() || "",
      order: `your ${cuisine} meal order`,
    });
  };

  const setSent = async (ids: string[], sent: boolean) => {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    setBusy(unique.join(","));
    try {
      const res = await markSent({ data: { ids: unique, sent, actingForInviterId: actingFor } });
      setRows((prev) => prev.map((r) => (unique.includes(r.id) ? { ...r, sent_at: res.sentAt } : r)));
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
    } catch (e) {
      toast.error("Couldn't copy", { description: getErrorMessage(e) });
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

  const totalPeople = rows.length;
  const totalMeals = rows.reduce((s, r) => s + r.qty, 0);
  const sentCount = rows.filter((r) => r.sent_at).length;

  return (
    <div className="space-y-5">
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
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{totalPeople} guests</Badge>
          <Badge variant="outline">{totalMeals} meals</Badge>
          <Badge variant="outline">{sentCount} texted</Badge>
          <Badge variant="outline">{totalPeople - sentCount} to go</Badge>
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
          Show only the guests I haven't texted yet
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
        const visible = onlyUnsent ? list.filter((x) => !x.sent_at) : list;
        const numbers = list
          .filter((x) => !x.sent_at)
          .map((x) => smsNumber(x.phone))
          .filter(Boolean);
        const chunks = chunkNumbers(numbers);

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
              {onHold ? (
                <p className="text-xs text-muted-foreground">
                  This restaurant isn't taking orders yet — hold off on texting this group.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {chunks.map((chunk, i) => (
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
                  ))}
                  <Button size="sm" variant="outline" onClick={() => void copy(groupBody(cuisine))}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy group message
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportSheet(cuisine, list)}>
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Restaurant sheet
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
                  <div
                    key={`${row.id}-${row.cuisine}`}
                    className={`p-4 space-y-2 ${row.sent_at ? "bg-emerald-50/60" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {mealOrderText(row.qty, row.cuisine)}
                      </Badge>
                      {row.sent_at ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                          Texted {new Date(row.sent_at).toLocaleDateString()}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-amber-700 text-[10px]"
                        >
                          Not texted
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.phone || "No phone on file"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {num && !onHold && (
                        <Button
                          size="sm"
                          className="bg-pink-500 text-white hover:bg-pink-600"
                          asChild
                          onClick={() => void setSent([row.id], true)}
                        >
                          <a href={smsHref([num], body)}>
                            <Send className="w-3.5 h-3.5 mr-1.5" /> Text{" "}
                            {row.name.split(/\s+/)[0]}
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => void copy(body)}>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy message
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
