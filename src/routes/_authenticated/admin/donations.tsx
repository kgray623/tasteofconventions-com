import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/admin/donations")({
  head: () => ({ meta: [{ title: "Donations — A Taste of Special Conventions" }] }),
  component: DonationsPage,
});

function DonationsPage() {
  const { isAdmin } = useRoles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("donations_summary")
        .select("total_amount, notes, updated_at")
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setTotal(String(data.total_amount ?? 0));
        setNotes(data.notes ?? "");
        setUpdatedAt(data.updated_at);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const parsed = Number(total);
    if (!Number.isFinite(parsed) || parsed < 0) return toast.error("Enter a valid amount");
    setSaving(true);
    const { data, error } = await supabase
      .from("donations_summary")
      .update({ total_amount: parsed, notes: notes.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", true)
      .select("updated_at")
      .maybeSingle();
    setSaving(false);
    if (error) return toast.error(error.message);
    if (data) setUpdatedAt(data.updated_at);
    toast.success("Donations total updated.");
  };

  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(total) || 0,
  );

  if (loading) return <div className="text-muted-foreground">Loading donations…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Funds</p>
        <h1 className="font-display text-3xl mt-1">Donations</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Track the total funds available to work with for the event.
        </p>
      </div>

      <Card className="p-6 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total available</p>
        <p className="font-display text-5xl text-ink">{formatted}</p>
        {updatedAt && (
          <p className="text-xs text-muted-foreground">
            Last updated {new Date(updatedAt).toLocaleString()}
          </p>
        )}
      </Card>

      {isAdmin ? (
        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="total">Total amount (USD)</Label>
            <Input
              id="total"
              type="number"
              min="0"
              step="0.01"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Includes pledges from…"
            />
          </div>
          <Button onClick={save} disabled={saving} className="bg-ink text-cream hover:bg-ink/90">
            {saving ? "Saving…" : "Save total"}
          </Button>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Only admins can edit the donations total.</p>
      )}
    </div>
  );
}
