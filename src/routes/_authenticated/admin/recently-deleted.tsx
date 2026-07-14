import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listDeletedRows, restoreDeletedRow } from "@/lib/invitations.functions";

export const Route = createFileRoute("/_authenticated/admin/recently-deleted")({
  component: RecentlyDeletedPage,
});

type ArchiveRow = {
  id: string;
  table_name: string;
  row_id: string;
  row_data: Record<string, unknown>;
  deleted_by_name: string | null;
  deleted_by_phone: string | null;
  deleted_at: string;
};

const TABLES = [
  { key: "invitations", label: "Invitations" },
  { key: "rsvps", label: "RSVPs" },
  { key: "inviters", label: "Inviters" },
  { key: "team_invites", label: "Team invites" },
  { key: "cuisine_preorders", label: "Cuisine preorders" },
];

function summary(table: string, row: Record<string, unknown>) {
  const get = (k: string) => (row[k] == null ? "" : String(row[k]));
  if (table === "invitations") return `${get("guest_name") || "—"} · ${get("guest_phone") || "No phone"}`;
  if (table === "rsvps") return `${get("status")} · party ${get("party_size") || "—"}`;
  if (table === "inviters") return `${get("name")} · quota ${get("quota")}`;
  if (table === "team_invites") return `${get("name")} · ${get("phone")} · ${get("role")}`;
  if (table === "cuisine_preorders") return `${get("name") || "—"} · ${get("phone")}`;
  return get("id");
}

function RecentlyDeletedPage() {
  const list = useServerFn(listDeletedRows);
  const restore = useServerFn(restoreDeletedRow);
  const [table, setTable] = useState("invitations");
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await list({ data: { table, days: 30 } });
      setRows((res?.rows ?? []) as ArchiveRow[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const onRestore = async (r: ArchiveRow) => {
    if (!confirm(`Restore this ${r.table_name} row?`)) return;
    setBusy(r.id);
    try {
      await restore({ data: { archive_id: r.id } });
      toast.success("Restored.");
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e: any) {
      toast.error(e?.message ?? "Restore failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Recently deleted</h1>
        <p className="text-sm text-muted-foreground">
          Rows deleted in the last 30 days. Click Restore to put a row back.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABLES.map((t) => (
          <Button
            key={t.key}
            variant={table === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTable(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <div className="font-medium">{summary(r.table_name, r.row_data)}</div>
                <div className="text-xs text-muted-foreground">
                  deleted {new Date(r.deleted_at).toLocaleString()}
                  {r.deleted_by_name ? ` · by ${r.deleted_by_name}` : ""}
                  {r.deleted_by_phone ? ` (${r.deleted_by_phone})` : ""}
                </div>
              </div>
              <Button size="sm" disabled={busy === r.id} onClick={() => onRestore(r)}>
                {busy === r.id ? "Restoring…" : "Restore"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
