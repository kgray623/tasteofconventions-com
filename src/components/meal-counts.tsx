import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Utensils } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/async-safety";
import { getMealNotifyRollup, type MealNotifyRollup } from "@/lib/meal-notify.functions";
import {
  householdsLabel,
  mealCountSubline,
  orderLinesLabel,
  platesLabel,
  readAtUtc,
} from "@/lib/meal-count-labels";

/**
 * The three meal numbers, always in the same order, always with the same
 * words, on every screen that shows any of them.
 */
export function MealCountBadges({
  plates,
  households,
  lines,
}: {
  plates: number;
  households: number;
  lines: number;
}) {
  return (
    <>
      <Badge variant="outline">{platesLabel(plates)}</Badge>
      <Badge variant="outline">{householdsLabel(households)}</Badge>
      <Badge variant="outline">{orderLinesLabel(lines)}</Badge>
    </>
  );
}

/**
 * Admin → Overview "Food orders" card. Reads the same ledger that the texting
 * queue reads, so the headline plate count can never disagree with it, and
 * stamps the read time so a stale phone screen is obvious.
 */
export function MealCountsCard() {
  const load = useServerFn(getMealNotifyRollup);
  const [data, setData] = useState<MealNotifyRollup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await load();
      setData(res);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const byCuisine = new Map<string, number>();
  for (const row of data?.rows ?? []) {
    byCuisine.set(row.cuisine, (byCuisine.get(row.cuisine) ?? 0) + row.qty);
  }
  const cuisineTotal = Array.from(byCuisine.values()).reduce((a, b) => a + b, 0);
  const plates = data?.totals.meal_quantity ?? 0;
  const platesReconcile = plates === cuisineTotal;

  return (
    <Card className="p-5 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Food orders</p>
          <div className="flex items-center gap-2 mt-2">
            <Utensils className="w-4 h-4 text-terracotta" />
            <Link to="/admin/preorders" className="font-display text-3xl underline-offset-4 hover:underline">
              {plates}
            </Link>
            <span className="text-sm text-muted-foreground">plates ordered</span>
          </div>
          {data && (
            <p className="text-xs text-muted-foreground mt-1">
              {mealCountSubline(data.totals.households, data.totals.message_units)}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">Couldn't read the meal counts. {error}</p>}

      {data && (
        <div className="space-y-1 pt-2 border-t">
          {Array.from(byCuisine.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cuisine, qty]) => (
              <div key={cuisine} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{cuisine}</span>
                <span className="tabular-nums font-medium">{qty}</span>
              </div>
            ))}
        </div>
      )}

      {data && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{data.totals.paid_meal_quantity} paid plates</Badge>
          <Badge variant="outline">{data.totals.unpaid_meal_quantity} unpaid plates</Badge>
          <Badge variant={platesReconcile ? "outline" : "destructive"}>
            {platesReconcile
              ? "Plates match the per-restaurant totals"
              : `Mismatch: ${plates} plates vs ${cuisineTotal} across restaurants`}
          </Badge>
          <Badge variant={data.totals.reconciles ? "outline" : "destructive"}>
            {data.totals.reconciles
              ? "Order lines all accounted for"
              : "Order lines don't add up — needs review"}
          </Badge>
        </div>
      )}

      {data && <p className="text-xs text-muted-foreground">{readAtUtc(data.generated_at)}</p>}
    </Card>
  );
}
