import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useMyUnpaidMeals } from "@/hooks/use-my-unpaid-meals";
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
  // The shared admin tab strip wraps to several rows on a phone, so landing at
  // scroll 0 would show only navigation. Bring the list into view immediately.
  const topRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const id = window.setTimeout(
      () => topRef.current?.scrollIntoView({ behavior: "instant", block: "start" }),
      0,
    );
    return () => window.clearTimeout(id);
  }, []);
  const restaurants = unpaid.restaurants ?? undefined;

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

  return (
    <div className="space-y-4 pb-16">
      <Card ref={topRef} className="p-3 border-terracotta/40 bg-terracotta/5 scroll-mt-2">
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
            {group.rows.map((row) => (
              <li key={`${row.id}::${row.cuisine}`} className="space-y-1 px-3 py-3 text-sm">
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
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
