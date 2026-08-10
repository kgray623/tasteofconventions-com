import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing, Download, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/async-safety";
import { downloadTextFile, openTextInNewTab } from "@/lib/download-file";
import { getMealNotifyRollup, type MealNotifyRollup } from "@/lib/meal-notify.functions";
import { MealCountBadges } from "@/components/meal-counts";
import { readAtUtc } from "@/lib/meal-count-labels";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function pendingCsv(data: MealNotifyRollup) {
  const header = ["Guest", "Phone", "Cuisine", "Meals", "Committee member", "Status"];
  const lines = data.rows
    .filter((row) => row.state === "needs_update" || row.state === "exception")
    .map((row) =>
      [
        row.name,
        row.phone,
        row.cuisine,
        row.qty,
        row.inviter,
        row.state === "exception" ? `Exception: ${row.exception ?? "needs review"}` : "Needs the payment text",
      ]
        .map(escapeCsv)
        .join(","),
    );
  return [header.join(","), ...lines].join("\n");
}


/**
 * Live "who still needs a pre-pay text" tracker, grouped by committee member.
 * Everything is read back from the database on each load, and pending only
 * clears when a human checks "Check here after you text".
 */
export function MealNotifyTracker({ compact = false }: { compact?: boolean }) {
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

  const download = () => {
    if (!data || data.totals.needs_update + data.totals.exceptions === 0) {
      toast.error("Nothing pending to download");
      return;
    }
    const csv = pendingCsv(data);
    const name = `meal-message-action-queue-${new Date().toISOString().slice(0, 10)}.csv`;
    const res = downloadTextFile(name, csv);
    if (res.ok) {
      toast.success("Pending list downloaded");
      return;
    }
    const tab = openTextInNewTab(csv);
    if (tab.ok) toast.success("Opened the pending list in a new tab");
    else toast.error("Couldn't download", { description: tab.reason });
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-terracotta" />
            <h3 className="font-display text-xl">Pre-pay notifications</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            One reconciled database ledger. Each restaurant order is in exactly one communication state.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}>
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={download}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Pending list
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-brand-red">
          Couldn't load the tracker. {error}
        </p>
      )}

      {loading && !data && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Reading the pre-orders…
        </p>
      )}

      {data && (
        <>
          <div className="rounded-md border border-border p-4">
            <p className="font-display text-3xl">
              {data.totals.needs_update}
              <span className="text-base text-muted-foreground font-sans">
                {" "}
                still need the payment text
              </span>
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <MealCountBadges
                plates={data.totals.meal_quantity}
                households={data.totals.households}
                lines={data.totals.message_units}
              />
              <Badge variant="outline">{data.totals.paid_confirmed} paid · restaurant confirmed</Badge>
              <Badge variant="outline">{data.totals.paid_reported} paid · awaiting confirmation</Badge>
              <Badge variant="outline">{data.totals.update_sent} payment text sent</Badge>
              <Badge variant="outline">{data.totals.exceptions} exceptions</Badge>

              <Badge variant={data.totals.reconciles ? "outline" : "destructive"}>
                {data.totals.reconciles ? "Counts reconcile" : "Accounting mismatch"}
              </Badge>
            </div>
          </div>


          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Committee member</th>
                  <th className="py-2 pr-3 text-right">Still to text</th>
                  <th className="py-2 pr-3 text-right">Text sent</th>
                  <th className="py-2 pr-3 text-right">Paid</th>
                  <th className="py-2 text-right">Exceptions</th>

                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.inviters.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted-foreground">
                      No cultural meal orders yet.
                    </td>
                  </tr>
                )}
                {data.inviters.map((row) => (
                  <tr key={row.inviter_id ?? "unlinked"}>
                    <td className="py-2 pr-3 font-medium">{row.name}</td>
                    <td className="py-2 pr-3 text-right">{row.needs_update}</td>
                    <td className="py-2 pr-3 text-right">{row.update_sent}</td>
                    <td className="py-2 pr-3 text-right">{row.paid_confirmed + row.paid_reported}</td>
                    <td className="py-2 text-right">{row.exceptions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


          {!compact && (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-ink text-cream hover:bg-ink/90">
                <Link to="/admin/meal-texts" search={{ view: undefined }}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Send pre-pay texts
                </Link>
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {readAtUtc(data.generated_at)}. Opening, copying, or tapping Text never changes this count; only “Check here after you text” does.
          </p>
        </>
      )}
    </Card>
  );
}
