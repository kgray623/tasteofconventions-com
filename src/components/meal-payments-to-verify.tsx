import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMealPaymentsToVerify } from "@/lib/meal-payments.functions";
import { getErrorMessage } from "@/lib/async-safety";

type Row = {
  id: string;
  guest: string;
  phone: string;
  cuisine: string;
  qty: number;
  paid_at: string | null;
  source: "guest_reported" | "committee_recorded";
  method: string | null;
  note: string | null;
  reported_by_label: string | null;
};

/**
 * Payments a guest or committee member reported that no restaurant has
 * verified yet. Nothing here is hidden or deleted — the restaurant confirms it
 * in their own portal, which flips the record to restaurant-confirmed.
 */
export function MealPaymentsToVerify() {
  const load = useServerFn(listMealPaymentsToVerify);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const res = await load({ data: undefined });
      setRows(res.rows as Row[]);
      setReadAt(res.generated_at);
      setError(null);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Could not load reported payments."));
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="p-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink">Payments to verify</h2>
          <p className="text-sm text-muted-foreground">
            Guests who told us they already paid the restaurant (for example Zelle with no name in
            the memo). They are counted as paid and are not texted again; the restaurant confirms
            them in their portal.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {rows && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing waiting for verification.</p>
      )}

      {rows && rows.length > 0 && (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="py-3 text-sm flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink">{r.guest}</span>
              {r.phone && (
                <a href={`tel:${r.phone.replace(/\D/g, "")}`} className="underline text-muted-foreground">
                  {r.phone}
                </a>
              )}
              <Badge variant="outline">
                {r.qty}× {r.cuisine}
              </Badge>
              {r.method && <Badge variant="outline">{r.method}</Badge>}
              <Badge variant="outline">
                {r.source === "guest_reported"
                  ? "Reported by guest"
                  : `Recorded by ${r.reported_by_label ?? "committee"}`}
              </Badge>
              <span className="text-muted-foreground">
                {r.paid_at ? new Date(r.paid_at).toLocaleString() : ""}
              </span>
              {r.note && <span className="text-muted-foreground">“{r.note}”</span>}
            </li>
          ))}
        </ul>
      )}

      {readAt && (
        <p className="text-xs text-muted-foreground">
          Read from the database {new Date(readAt).toISOString().replace("T", " ").slice(0, 16)} UTC.
        </p>
      )}
    </Card>
  );
}
