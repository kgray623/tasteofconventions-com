import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isPaidState } from "@/lib/meal-communication";
import { cuisineLabel } from "@/lib/meal-text-message";
import { MEAL_PRICE_LINE } from "@/lib/meal-pricing";
import type { CommitteeMealTextRow } from "@/lib/committee-meal-texts.functions";

/**
 * Plain paid / not-paid roster for one committee member's own guests, so they
 * know exactly who still needs a follow-up about pre-paying their meal.
 * Read from the same canonical ledger as the texting queue — nothing is hidden,
 * and every order line appears in exactly one of the two groups.
 */
export function CommitteeMealPayments({
  rows,
  totals,
  generatedAt,
}: {
  rows: CommitteeMealTextRow[];
  totals: { plates: number; paid_plates: number; unpaid_plates: number };
  generatedAt?: string | null;
}) {
  const paid = useMemo(() => rows.filter((r) => isPaidState(r.state)), [rows]);
  const unpaid = useMemo(() => rows.filter((r) => !isPaidState(r.state)), [rows]);

  const byCuisine = (list: CommitteeMealTextRow[]) => {
    const map = new Map<string, CommitteeMealTextRow[]>();
    for (const r of list) {
      if (!map.has(r.cuisine)) map.set(r.cuisine, []);
      map.get(r.cuisine)!.push(r);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  const paidLabel = (r: CommitteeMealTextRow) => {
    const when = r.paid_at ? new Date(r.paid_at).toLocaleDateString() : null;
    if (r.state === "paid_confirmed")
      return `Confirmed by the restaurant${when ? ` · ${when}` : ""}`;
    return `Reported, awaiting restaurant confirmation${when ? ` · ${when}` : ""}`;
  };

  if (rows.length === 0) return null;

  return (
    <Card className="p-5 space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-2xl text-ink">My guests' meal payments</h2>
        <p className="text-sm text-muted-foreground">
          Who has pre-paid the restaurant and who still needs a follow-up from you.{" "}
          {MEAL_PRICE_LINE}.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">
            {totals.paid_plates} of {totals.plates} plates paid
          </Badge>
          <Badge variant="outline">{totals.unpaid_plates} plates still to pay</Badge>
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="font-medium text-ink">Not paid yet — follow up ({unpaid.length})</h3>
        {unpaid.length === 0 && (
          <p className="text-sm text-muted-foreground">Everyone you brought has paid.</p>
        )}
        {byCuisine(unpaid).map(([cuisine, list]) => (
          <div key={cuisine} className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {cuisineLabel(cuisine)}
            </p>
            <ul className="divide-y divide-border">
              {list.map((r) => (
                <li
                  key={`${r.id}::${r.cuisine}`}
                  className="py-2 flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="font-medium text-ink">{r.name}</span>
                  {r.phone && (
                    <a
                      href={`tel:${r.phone.replace(/\D/g, "")}`}
                      className="underline text-muted-foreground"
                    >
                      {r.phone}
                    </a>
                  )}
                  <Badge variant="outline">{r.qty} plates</Badge>
                  <Badge variant="outline">
                    {r.zelle_sent_at
                      ? `Payment update sent ${new Date(r.zelle_sent_at).toLocaleDateString()}`
                      : "Payment update not sent yet"}
                  </Badge>
                  {r.exception && (
                    <span className="text-xs text-muted-foreground">{r.exception}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="font-medium text-ink">Paid ({paid.length})</h3>
        {paid.length === 0 && (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        )}
        {byCuisine(paid).map(([cuisine, list]) => (
          <div key={cuisine} className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {cuisineLabel(cuisine)}
            </p>
            <ul className="divide-y divide-border">
              {list.map((r) => (
                <li
                  key={`${r.id}::${r.cuisine}`}
                  className="py-2 flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="font-medium text-ink">{r.name}</span>
                  <Badge variant="outline">{r.qty} plates</Badge>
                  <Badge variant="outline">{paidLabel(r)}</Badge>
                  {r.paid_note && (
                    <span className="text-xs text-muted-foreground">“{r.paid_note}”</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {generatedAt && (
        <p className="text-xs text-muted-foreground">
          Read from the database {new Date(generatedAt).toISOString().replace("T", " ").slice(0, 16)}{" "}
          UTC.
        </p>
      )}
    </Card>
  );
}
