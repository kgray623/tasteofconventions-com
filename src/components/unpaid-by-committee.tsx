import { useMemo } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile, openTextInNewTab } from "@/lib/download-file";
import { isPaidState } from "@/lib/meal-communication";
import { cuisineLabel } from "@/lib/meal-text-message";
import {
  MEAL_PAY_DEADLINE_LINE,
  MEAL_PRICE_SUMMARY,
  formatMealMoney,
  mealPricesForCuisine,
} from "@/lib/meal-pricing";
import type { MealTextRow } from "@/lib/meal-texts.functions";

/**
 * Every unpaid catered-meal order grouped by the committee member who brought
 * the guest. Presentational only: it reads the same `rows` the page header
 * counts, so the totals here can never disagree with the metrics above.
 * Nothing is hidden — orders with no committee owner get their own group.
 */

const NO_OWNER = "Not linked to a committee member";

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) return value || "No phone on file";
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const csvEscape = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

type RestaurantLike = {
  name?: string | null;
  cuisine?: string | null;
  chicken_price?: number | string | null;
  beef_price?: number | string | null;
  price_note?: string | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function UnpaidByCommittee({
  rows,
  generatedAt,
  restaurants,
}: {
  rows: MealTextRow[];
  generatedAt?: string | null;
  restaurants?: RestaurantLike[] | undefined;
}) {
  const unpaid = useMemo(() => rows.filter((row) => !isPaidState(row.state)), [rows]);

  /**
   * Amount owed for one order line, using that guest's own restaurant prices
   * (tax included). Protein isn't captured yet, so it stays a chicken–beef
   * range — but the range is now restaurant-specific, not a flat placeholder.
   */
  const owedFor = (row: MealTextRow) => {
    const prices = mealPricesForCuisine(row.cuisine, restaurants);
    const low = prices?.chicken ?? null;
    const high = prices?.beef ?? null;
    return {
      low: low === null ? null : round2(low * row.qty),
      high: high === null ? null : round2(high * row.qty),
      unit: prices,
    };
  };

  const owedLabel = (row: MealTextRow) => {
    const { low, high } = owedFor(row);
    const lowText = formatMealMoney(low);
    const highText = formatMealMoney(high);
    if (!lowText || !highText) return null;
    return lowText === highText ? `${lowText} owed` : `${lowText}–${highText} owed`;
  };

  const sumOwed = (list: MealTextRow[]) =>
    list.reduce(
      (acc, row) => {
        const { low, high } = owedFor(row);
        return { low: acc.low + (low ?? 0), high: acc.high + (high ?? 0) };
      },
      { low: 0, high: 0 },
    );

  const rangeLabel = (list: MealTextRow[]) => {
    const { low, high } = sumOwed(list);
    if (!low && !high) return null;
    return `${formatMealMoney(round2(low))}–${formatMealMoney(round2(high))}`;
  };

  const groups = useMemo(() => {
    const map = new Map<string, MealTextRow[]>();
    for (const row of unpaid) {
      const key = row.inviter?.trim() || NO_OWNER;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return [...map.entries()]
      .map(([member, list]) => ({
        member,
        rows: [...list].sort(
          (a, b) => a.name.localeCompare(b.name) || a.cuisine.localeCompare(b.cuisine),
        ),
        plates: list.reduce((sum, row) => sum + row.qty, 0),
        notTexted: list.filter((row) => !row.zelle_sent_at).length,
      }))
      .sort((a, b) => b.plates - a.plates || a.member.localeCompare(b.member));
  }, [unpaid]);

  const totalPlates = groups.reduce((sum, group) => sum + group.plates, 0);

  const downloadCsv = () => {
    const csv = [
      [
        "Committee member",
        "Guest",
        "Phone",
        "Cuisine",
        "Restaurant",
        "Plates",
        "Chicken price (tax incl.)",
        "Beef price (tax incl.)",
        "Owed if chicken",
        "Owed if beef",
        "Payment text sent",
        "Paid?",
      ].join(","),
      ...groups.flatMap((group) =>
        group.rows.map((row) => {
          const { low, high, unit } = owedFor(row);
          return [
            group.member,
            row.name,
            formatPhone(row.phone),
            cuisineLabel(row.cuisine),
            unit?.restaurant ?? "",
            row.qty,
            formatMealMoney(unit?.chicken) ?? "",
            formatMealMoney(unit?.beef) ?? "",
            formatMealMoney(low) ?? "",
            formatMealMoney(high) ?? "",
            row.zelle_sent_at ? new Date(row.zelle_sent_at).toISOString().slice(0, 10) : "NOT SENT",
            "NOT PAID",
          ].map(csvEscape).join(",");
        }),
      ),
    ].join("\n");
    const name = `unpaid-meals-by-committee-${new Date().toISOString().slice(0, 10)}.csv`;
    if (downloadTextFile(name, csv).ok) toast.success("Unpaid list downloaded");
    else if (openTextInNewTab(csv).ok) toast.success("Unpaid list opened in a new tab");
    else toast.error("Couldn't export the unpaid list");
  };

  if (unpaid.length === 0) return null;

  return (
    <section className="space-y-4 border-t border-border pt-4" aria-label="Unpaid guests by committee member">
      <div className="space-y-1">
        <h2 className="font-display text-2xl">Unpaid guests by committee member</h2>
        <p className="text-sm text-muted-foreground">
          Every order still unpaid, grouped by who brought the guest. {MEAL_PRICE_LINE}. Protein is chosen at
          the restaurant, so the amount owed is shown as a range. {MEAL_PAY_DEADLINE_LINE}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{unpaid.length} unpaid orders</Badge>
          <Badge variant="outline">{totalPlates} unpaid plates</Badge>
          <Badge variant="outline">
            ${(totalPlates * 20).toLocaleString()}–${(totalPlates * 25).toLocaleString()} outstanding
          </Badge>
        </div>
        <div className="pt-2">
          <Button size="sm" variant="outline" onClick={downloadCsv}>
            <Download className="mr-2 h-4 w-4" /> Download unpaid list (CSV)
          </Button>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.member} className="border border-border">
          <div className="border-b border-border px-3 py-2">
            <h3 className="font-semibold">{group.member}</h3>
            <p className="text-xs text-muted-foreground">
              {group.rows.length} unpaid {group.rows.length === 1 ? "order" : "orders"} · {group.plates} plates
              · ${(group.plates * 20).toLocaleString()}–${(group.plates * 25).toLocaleString()}
              {group.notTexted > 0 ? ` · ${group.notTexted} with no payment text sent` : ""}
            </p>
          </div>
          <ul className="divide-y divide-border">
            {group.rows.map((row) => (
              <li key={`${row.id}::${row.cuisine}`} className="space-y-1 px-3 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{row.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.qty} {row.qty === 1 ? "plate" : "plates"} · {cuisineLabel(row.cuisine)}
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
                  <Badge variant="outline">
                    ${(row.qty * 20).toLocaleString()}–${(row.qty * 25).toLocaleString()} owed
                  </Badge>
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

      {generatedAt && (
        <p className="text-xs text-muted-foreground">
          Read from the database {new Date(generatedAt).toISOString().replace("T", " ").slice(0, 16)} UTC
        </p>
      )}
    </section>
  );
}
