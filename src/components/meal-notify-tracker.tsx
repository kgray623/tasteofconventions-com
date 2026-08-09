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

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function pendingCsv(data: MealNotifyRollup) {
  const header = ["Guest", "Phone", "Cuisine", "Meals", "Committee member", "Notified"];
  const lines = data.pending.map((row) =>
    [row.name, row.phone, row.cuisine, row.qty, row.inviter, "Not yet"].map(escapeCsv).join(","),
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
  const [campaign, setCampaign] = useState<"original" | "update">("update");

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await load({ data: { campaign } });
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
  }, [campaign]);

  const download = () => {
    if (!data || data.pending.length === 0) {
      toast.error("Nothing pending to download");
      return;
    }
    const csv = pendingCsv(data);
    const name = `${campaign === "update" ? "payment-update" : "original-meal-message"}-pending-${new Date().toISOString().slice(0, 10)}.csv`;
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
            One database ledger at a time. New payment updates start at zero and only change after an explicit check.
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

      <div className="flex flex-wrap gap-2" aria-label="Message campaign">
        <Button size="sm" variant={campaign === "original" ? "default" : "outline"} onClick={() => setCampaign("original")}>
          Original meal message
        </Button>
        <Button size="sm" variant={campaign === "update" ? "default" : "outline"} onClick={() => setCampaign("update")}>
          New payment update
        </Button>
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
              {data.totals.pending}
              <span className="text-base text-muted-foreground font-sans">
                {" "}
                of {data.totals.preorders} restaurant-order messages still need the {campaign === "update" ? "new payment update" : "original meal message"}
              </span>
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline">{data.totals.notified} explicitly marked sent</Badge>
              <Badge variant="outline">{data.totals.meals} meals ordered (quantities)</Badge>
            </div>
          </div>


          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Committee member</th>
                  <th className="py-2 pr-3 text-right">Invites</th>
                  <th className="py-2 pr-3 text-right">Meal orders</th>
                  <th className="py-2 pr-3 text-right">Texted</th>
                  <th className="py-2 text-right">Still pending</th>

                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.inviters.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted-foreground">
                      No cultural meal pre-orders yet.
                    </td>
                  </tr>
                )}
                {data.inviters.map((row) => (
                  <tr key={row.inviter_id ?? "unlinked"}>
                    <td className="py-2 pr-3 font-medium">{row.name}</td>
                    <td className="py-2 pr-3 text-right">{row.invites || "—"}</td>
                    <td className="py-2 pr-3 text-right">{row.preorders}</td>
                    <td className="py-2 pr-3 text-right">{row.notified}</td>
                    <td className="py-2 text-right">
                      {row.pending > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-amber-700 text-[11px]"
                        >
                          {row.pending}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[11px]">
                          All done
                        </Badge>
                      )}
                    </td>
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
            Read from the database {new Date(data.generated_at).toLocaleString()}. Opening, copying, or tapping Text never changes this count; only “Check here after you text” does.
          </p>
        </>
      )}
    </Card>
  );
}
