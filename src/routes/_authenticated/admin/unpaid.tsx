import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useMyUnpaidMeals } from "@/hooks/use-my-unpaid-meals";
import { useServerFn } from "@tanstack/react-start";
import { saveMealFollowUpNote } from "@/lib/meal-follow-up-notes.functions";
import { cuisineLabel } from "@/lib/meal-text-message";
import {
  MEAL_PAY_DEADLINE_LINE,
  formatMealMoney,
  mealPricesForCuisine,
} from "@/lib/meal-pricing";

/**
 * One page, one link: every unpaid catered-meal guest for the whole event,
 * grouped under the committee member who invited them. Identical for admins and
 * committee members — both read the same committee-wide ledger
 * (`useMyUnpaidMeals`), so no count on this page can disagree with the nav
 * badge. Presentation only: paid/unpaid comes from the server ledger and prices
 * come from the live `restaurants` rows.
 *
 * Follow-up notes are committee-visible only and never mark a guest paid or
 * hide them from the unpaid list.
 */

export const Route = createFileRoute("/_authenticated/admin/unpaid")({
  head: () => ({
    meta: [
      { title: "Unpaid guests — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Every guest who still owes for a catered meal, grouped by the committee member who invited them.",
      },
      { property: "og:title", content: "Unpaid guests — A Taste of Special Conventions" },
      {
        property: "og:description",
        content:
          "Every guest who still owes for a catered meal, grouped by the committee member who invited them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnpaidGuestsPage,
});

const formatPhone = (value: string) => {
  const digits = (value ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) return value || "No phone on file";
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function UnpaidGuestsPage() {
  const unpaid = useMyUnpaidMeals();
  const restaurants = unpaid.restaurants ?? undefined;
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const saveNote = useServerFn(saveMealFollowUpNote);

  const owedFor = (cuisine: string, qty: number) => {
    const prices = mealPricesForCuisine(cuisine, restaurants);
    return {
      low: prices?.chicken == null ? null : round2(prices.chicken * qty),
      high: prices?.beef == null ? null : round2(prices.beef * qty),
      unit: prices,
    };
  };

  const owedLabel = (cuisine: string, qty: number) => {
    const { low, high } = owedFor(cuisine, qty);
    const lowText = formatMealMoney(low);
    const highText = formatMealMoney(high);
    if (!lowText || !highText) return null;
    return lowText === highText ? `${lowText} owed` : `${lowText}–${highText} owed`;
  };

  const rangeLabel = (rows: { cuisine: string; qty: number }[]) => {
    const totals = rows.reduce(
      (acc, row) => {
        const { low, high } = owedFor(row.cuisine, row.qty);
        return { low: acc.low + (low ?? 0), high: acc.high + (high ?? 0) };
      },
      { low: 0, high: 0 },
    );
    if (!totals.low && !totals.high) return null;
    return `${formatMealMoney(round2(totals.low))}–${formatMealMoney(round2(totals.high))}`;
  };

  const startEdit = (row: (typeof unpaid.groups)[number]["rows"][number]) => {
    const key = `${row.id}::${row.cuisine}`;
    const existing = unpaid.notesByKey.get(key)?.note ?? "";
    setEditingKey(key);
    setDraftNote(existing);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftNote("");
  };

  const commitEdit = async (row: (typeof unpaid.groups)[number]["rows"][number]) => {
    const key = `${row.id}::${row.cuisine}`;
    if (editingKey !== key) return;
    setSaving(true);
    try {
      await saveNote({
        data: {
          preorder_id: row.id,
          cuisine: row.cuisine,
          invitation_id: row.invitationId ?? null,
          note: draftNote.trim(),
        },
      });
      // Refetch the shared notes ledger so the saved note is visible right away
      // instead of disappearing until the 60s staleTime expires.
      await queryClient.invalidateQueries({ queryKey: ["meal-follow-up-notes"] });
      setEditingKey(null);
      setDraftNote("");
      toast.success("Follow-up note saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? `Could not save note: ${error.message}` : "Could not save note.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      <Card className="p-3 border-terracotta/40 bg-terracotta/5">
        <h1 className="font-display text-2xl">Unpaid guests</h1>
        <p className="text-sm text-muted-foreground pt-1">
          {unpaid.loading
            ? "Reading payment status from the database…"
            : unpaid.error
              ? `Could not load payment status: ${unpaid.error}`
              : `${unpaid.count} guests across the whole committee still owe for a meal (${unpaid.plates} plates), grouped by the committee member who invited them. Guests who declined or are Zoom-only are excluded. ${MEAL_PAY_DEADLINE_LINE}`}
        </p>
        {!unpaid.loading && !unpaid.error && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">{unpaid.count} guests</Badge>
            <Badge variant="outline">{unpaid.orderLines} order lines</Badge>
            <Badge variant="outline">{unpaid.plates} plates</Badge>
            {rangeLabel(unpaid.unpaidRows) && (
              <Badge variant="outline">{rangeLabel(unpaid.unpaidRows)} outstanding</Badge>
            )}
          </div>
        )}
      </Card>

      {!unpaid.loading && !unpaid.error && unpaid.groups.length === 0 && (
        <Card className="p-4 text-sm text-muted-foreground">
          Every guest with a catered meal has paid. Nothing outstanding.
        </Card>
      )}

      {unpaid.groups.map((group) => (
        <div key={group.inviterId ?? "__none__"} className="border border-border">
          <div className="border-b border-border px-3 py-2">
            <h2 className="font-semibold">{group.inviterName}</h2>
            <p className="text-xs text-muted-foreground">
              {group.guests} unpaid guest{group.guests === 1 ? "" : "s"} · {group.plates} plate
              {group.plates === 1 ? "" : "s"}
              {rangeLabel(group.rows) ? ` · ${rangeLabel(group.rows)}` : ""}
            </p>
          </div>
          <ul className="divide-y divide-border">
            {group.rows.map((row) => {
              const key = `${row.id}::${row.cuisine}`;
              const note = unpaid.notesByKey.get(key);
              const isEditing = editingKey === key;
              return (
                <li key={key} className="space-y-1 px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{row.guestName || row.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.qty} {row.qty === 1 ? "plate" : "plates"} · {cuisineLabel(row.cuisine)}
                      {owedFor(row.cuisine, row.qty).unit?.restaurant
                        ? ` · ${owedFor(row.cuisine, row.qty).unit?.restaurant}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.phone ? (
                      <a href={`sms:${row.phone.replace(/\D/g, "")}`} className="font-mono underline">
                        {formatPhone(row.phone)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No phone on file</span>
                    )}
                    {owedLabel(row.cuisine, row.qty) && (
                      <Badge variant="outline">{owedLabel(row.cuisine, row.qty)}</Badge>
                    )}
                    <Badge variant="outline">
                      {row.zelle_sent_at
                        ? `Payment text sent ${new Date(row.zelle_sent_at).toLocaleDateString()}`
                        : "Payment text NOT sent"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => startEdit(row)}
                      aria-label={note ? "Edit follow-up note" : "Add follow-up note"}
                    >
                      <Pencil className="size-3" />
                      {note ? "Edit note" : "Note"}
                    </Button>
                  </div>

                  {isEditing ? (
                    <div className="pt-2 space-y-2">
                      <Textarea
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        placeholder="Add a committee-visible follow-up note…"
                        className="min-h-[60px] text-sm"
                        maxLength={500}
                        disabled={saving}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={saving || !draftNote.trim()}
                          onClick={() => commitEdit(row)}
                        >
                          <Check className="size-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={saving}
                          onClick={cancelEdit}
                        >
                          <X className="size-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : note ? (
                    <div className="pt-1 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                      <span className="font-medium text-foreground">Note:</span> {note.note}
                      {note.created_by_label && (
                        <span className="italic"> — {note.created_by_label}</span>
                      )}
                      {note.updated_at && (
                        <span className="text-[10px] opacity-70">
                          {" "}
                          {new Date(note.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
