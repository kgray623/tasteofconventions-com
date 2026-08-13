import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeDollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/async-safety";
import { recordMealPaymentForGuest } from "@/lib/meal-payments.functions";

const METHODS = [
  { value: "called_restaurant", label: "Called the restaurant" },
  { value: "zelle", label: "Zelle" },
  { value: "venmo", label: "Venmo" },
  { value: "cash", label: "Cash" },
  { value: "in_person", label: "Paid in person" },
  { value: "other", label: "Other" },
] as const;

export type RecordPaymentOrder = { cuisine: string; qty: number };

/**
 * Records a payment somebody reported to you (phoned in, cash, in person).
 * Nothing is ever removed by this: the record is written once, attributed to
 * you, and stays visible as "awaiting restaurant confirmation" until a
 * restaurant confirms it in their own portal.
 */
export function RecordMealPaymentDialog({
  preorderId,
  guestName,
  orders,
  onRecorded,
  label = "Record payment",
  size = "sm",
  variant = "outline",
}: {
  preorderId: string;
  guestName: string;
  orders: RecordPaymentOrder[];
  onRecorded?: () => void | Promise<void>;
  label?: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
}) {
  const record = useServerFn(recordMealPaymentForGuest);
  const [open, setOpen] = useState(false);
  const [cuisine, setCuisine] = useState(orders[0]?.cuisine ?? "");
  const [qty, setQty] = useState(String(orders[0]?.qty ?? 1));
  const [method, setMethod] = useState<string>("called_restaurant");
  const [reportedBy, setReportedBy] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const pickCuisine = (value: string) => {
    setCuisine(value);
    const match = orders.find((o) => o.cuisine === value);
    if (match) setQty(String(match.qty));
  };

  const submit = async () => {
    const plates = Math.max(1, Math.round(Number(qty) || 1));
    setSaving(true);
    try {
      const res = await record({
        data: {
          preorder_id: preorderId,
          cuisine,
          qty: plates,
          method: method as (typeof METHODS)[number]["value"],
          reported_by: reportedBy.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      if ((res as { alreadyConfirmed?: boolean }).alreadyConfirmed) {
        toast.success("The restaurant had already confirmed this payment — nothing changed");
      } else {
        toast.success(`Payment recorded for ${guestName}`, {
          description: "Kept on record and awaiting restaurant confirmation.",
        });
      }
      setOpen(false);
      setNote("");
      await onRecorded?.();
    } catch (e) {
      toast.error("Couldn't record the payment", { description: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (orders.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant}>
          <BadgeDollarSign className="mr-1.5 h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record a payment for {guestName}</DialogTitle>
          <DialogDescription>
            Use this whenever someone tells you a guest already paid the restaurant — by phone,
            cash, or in person. It is saved permanently and shown as awaiting restaurant
            confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="rp-cuisine" className="text-sm font-medium">
              Which meal
            </label>
            <select
              id="rp-cuisine"
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={cuisine}
              onChange={(e) => pickCuisine(e.target.value)}
            >
              {orders.map((o) => (
                <option key={o.cuisine} value={o.cuisine}>
                  {o.cuisine} · {o.qty} plate{o.qty === 1 ? "" : "s"} ordered
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="rp-qty" className="text-sm font-medium">
              Plates paid for
            </label>
            <Input
              id="rp-qty"
              type="number"
              inputMode="numeric"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="rp-method" className="text-sm font-medium">
              How they paid
            </label>
            <select
              id="rp-method"
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="rp-reported-by" className="text-sm font-medium">
              Who told you (optional)
            </label>
            <Input
              id="rp-reported-by"
              placeholder="e.g. Melissa Novotny"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="rp-note" className="text-sm font-medium">
              Note (optional)
            </label>
            <Textarea
              id="rp-note"
              rows={2}
              placeholder="Called the restaurant and paid on Aug 11"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button className="w-full" disabled={saving || !cuisine} onClick={() => void submit()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save payment record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
