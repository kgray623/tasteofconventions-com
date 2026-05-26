import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Utensils, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useRoles } from "@/hooks/use-roles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/preorders")({
  head: () => ({ meta: [{ title: "Preorder Report — Admin" }] }),
  component: PreorderReportPage,
});

type PreorderRow = Database["public"]["Tables"]["cuisine_preorders"]["Row"];
type Selection = { cuisine: string; qty: number };

const CUISINES = ["Myanmar", "African", "Indonesian"] as const;

function normalizeCuisine(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("burmese") || lower.includes("myanmar")) return "Myanmar";
  if (lower.includes("african") || lower.includes("africa")) return "African";
  if (lower.includes("indonesian") || lower.includes("indonesia")) return "Indonesian";
  return value.trim() || "Other";
}

function parseSelections(value: Json): Selection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const rawCuisine = "cuisine" in item ? String(item.cuisine ?? "") : "";
    const rawQty = "qty" in item ? Number(item.qty) : 0;
    const qty = Number.isFinite(rawQty) ? Math.max(0, Math.round(rawQty)) : 0;
    return rawCuisine && qty > 0 ? [{ cuisine: normalizeCuisine(rawCuisine), qty }] : [];
  });
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function PreorderReportPage() {
  const { isTeam, loading: rolesLoading } = useRoles();
  const [rows, setRows] = useState<PreorderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cuisine_preorders")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as PreorderRow[]) ?? []);
    setLoading(false);
  };

  const deleteRow = async (id: string, name: string) => {
    if (!window.confirm(`Delete preorder entry for ${name}? This removes all their cuisine selections.`)) return;
    const { error } = await supabase.from("cuisine_preorders").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Preorder entry deleted");
  };

  useEffect(() => {
    if (!rolesLoading && isTeam) void load();
  }, [rolesLoading, isTeam]);

  const detailedRows = useMemo(() => {
    return rows.flatMap((row) =>
      parseSelections(row.selections).map((selection) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        cuisine: selection.cuisine,
        qty: selection.qty,
        updatedAt: row.updated_at,
      })),
    );
  }, [rows]);

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const cuisine of CUISINES) map.set(cuisine, 0);
    for (const row of detailedRows) map.set(row.cuisine, (map.get(row.cuisine) ?? 0) + row.qty);
    return Array.from(map.entries()).map(([cuisine, qty]) => ({ cuisine, qty }));
  }, [detailedRows]);

  const totalMeals = totals.reduce((sum, row) => sum + row.qty, 0);

  const exportCsv = () => {
    const summaryLines = [
      ["Cuisine", "Total dishes"],
      ...totals.map((row) => [row.cuisine, row.qty]),
      ["Grand total", totalMeals],
      [],
      ["Guest name", "Phone", "Cuisine", "Dishes", "Last updated"],
      ...detailedRows.map((row) => [row.name, row.phone, row.cuisine, row.qty, new Date(row.updatedAt).toLocaleString()]),
    ];
    const csv = summaryLines.map((line) => line.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuisine-preorder-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (rolesLoading || loading) return <p className="text-muted-foreground">Loading preorder report…</p>;
  if (!isTeam) return <p className="text-muted-foreground">You do not have access to this report.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Restaurant counts</p>
          <h2 className="font-display text-3xl mt-2">Cuisine preorder report</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Download this report when you are ready to tell each restaurant how many dishes people requested.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={exportCsv} disabled={detailedRows.length === 0} className="bg-ink text-cream hover:bg-ink/90">
            <Download className="w-4 h-4" /> Download CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {totals.map((row) => (
          <Card key={row.cuisine} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{row.cuisine}</p>
              <Utensils className="w-4 h-4 text-terracotta" />
            </div>
            <p className="font-display text-4xl mt-3">{row.qty}</p>
            <p className="text-xs text-muted-foreground mt-1">dishes requested</p>
          </Card>
        ))}
        <Card className="p-5 border-terracotta/30 bg-terracotta/5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Grand total</p>
          <p className="font-display text-4xl mt-3">{totalMeals}</p>
          <p className="text-xs text-muted-foreground mt-1">all requested dishes</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display text-xl">Guest preorder details</h3>
          <p className="text-sm text-muted-foreground mt-1">Each selected cuisine appears as a separate row.</p>
        </div>
        {detailedRows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No preorder counts have been submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Cuisine</th>
                  <th className="px-4 py-3 font-medium text-right">Dishes</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detailedRows.map((row) => (
                  <tr key={`${row.id}-${row.cuisine}`}>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.phone}</td>
                    <td className="px-4 py-3">{row.cuisine}</td>
                    <td className="px-4 py-3 text-right font-display text-xl">{row.qty}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(row.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}