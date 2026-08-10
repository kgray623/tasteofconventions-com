import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reportMyMealPayment } from "@/lib/meal-payments.functions";
import { getErrorMessage } from "@/lib/async-safety";

type Props = {
  token: string;
  /** Cuisines the guest ordered that have no payment recorded yet. */
  unpaid: { cuisine: string; qty: number }[];
  onReported: (cuisine: string, qty: number, method: string) => void;
};

const METHODS = [
  { key: "zelle", label: "Zelle" },
  { key: "venmo", label: "Venmo" },
  { key: "cash", label: "Cash" },
  { key: "other", label: "Other" },
] as const;

/**
 * Lets a guest tell us they already paid the restaurant directly — the Zelle
 * "no memo" case. The report is recorded immediately (so the guest sees a
 * receipt and stops getting payment reminders) and stays flagged for the
 * restaurant to confirm.
 */
export function GuestMealPaymentReport({ token, unpaid, onReported }: Props) {
  const report = useServerFn(reportMyMealPayment);
  const [busy, setBusy] = useState<string | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);

  if (unpaid.length === 0) return null;

  const submit = async (cuisine: string, qty: number, method: string) => {
    setBusy(`${cuisine}:${method}`);
    try {
      const res = await report({
        data: { token, cuisine, qty, method: method as "zelle", note: null ?? undefined },
      });
      if (res?.alreadyConfirmed) {
        toast.success("The restaurant had already confirmed this payment.");
      } else {
        toast.success("Thank you — your payment is recorded and shown on your RSVP.");
      }
      onReported(cuisine, qty, method);
      setOpenFor(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Could not record your payment."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-7 space-y-4">
      <div>
        <h2 className="font-display text-2xl text-ink">Already paid your meal?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          If you already sent payment to the restaurant (and especially if you did not put your
          name in the Zelle or Venmo memo), tell us here. Your receipt shows up right away and the
          restaurant confirms it on their side.
        </p>
      </div>

      <ul className="divide-y divide-border">
        {unpaid.map((item) => (
          <li key={item.cuisine} className="py-3 space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-display text-lg w-8 text-terracotta">{item.qty}×</span>
              <span className="flex-1 text-ink">{item.cuisine}</span>
              <Button
                size="sm"
                variant={openFor === item.cuisine ? "secondary" : "outline"}
                onClick={() => setOpenFor(openFor === item.cuisine ? null : item.cuisine)}
              >
                I already paid
              </Button>
            </div>
            {openFor === item.cuisine && (
              <div className="flex flex-wrap items-center gap-2 pl-11">
                <span className="text-xs text-muted-foreground">How did you pay?</span>
                {METHODS.map((m) => (
                  <Button
                    key={m.key}
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => submit(item.cuisine, item.qty, m.key)}
                  >
                    {busy === `${item.cuisine}:${m.key}` ? "Saving…" : m.label}
                  </Button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <Badge variant="outline" className="text-xs">
        Nothing is ever deleted — reports stay on record until the restaurant confirms them.
      </Badge>
    </Card>
  );
}
