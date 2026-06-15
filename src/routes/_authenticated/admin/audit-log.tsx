import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/audit-log")({
  component: AuditLogPage,
});

type Row = {
  id: string;
  user_id: string | null;
  phone_normalized: string | null;
  display_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip: string | null;
  user_agent: string | null;
  metadata: any;
  success: boolean;
  created_at: string;
};

function shortUA(ua: string | null) {
  if (!ua) return "—";
  const m = ua.match(/(iPhone|iPad|Android|Macintosh|Windows|Linux)/);
  return m ? m[1] : ua.slice(0, 24);
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString();
}

function AuditLogPage() {
  const { isAdmin, loading } = useRoles();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (loading || !isAdmin) return;
    setFetching(true);
    supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setRows((data ?? []) as Row[]);
        setFetching(false);
      });
  }, [loading, isAdmin]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [
        r.action,
        r.display_name ?? "",
        r.phone_normalized ?? "",
        r.ip ?? "",
        r.user_agent ?? "",
        r.target_type ?? "",
        r.target_id ?? "",
        JSON.stringify(r.metadata ?? {}),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [rows, q]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!isAdmin)
    return (
      <p className="text-muted-foreground">
        Only administrators can view the audit log.
      </p>
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl text-ink">Audit log</h1>
        <p className="text-xs text-muted-foreground">
          Every sign-in attempt and every create / update / delete on RSVPs, chats,
          invitations, roles, and assignments — with who, when, and from what device.
        </p>
      </div>
      <Input
        placeholder="Search by name, phone, IP, action, target…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length} most-recent events.
        {fetching && " Loading…"}
      </p>
      <div className="space-y-2">
        {filtered.map((r) => (
          <Card key={r.id} className="p-3 text-xs space-y-1">
            <div className="flex justify-between gap-2 flex-wrap">
              <span className="font-mono font-medium">
                {r.action}
                {!r.success && <span className="text-red-600 ml-1">[FAILED]</span>}
              </span>
              <span className="text-muted-foreground">{formatTime(r.created_at)}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-muted-foreground">
              <span>👤 {r.display_name ?? "—"}</span>
              <span>📱 {r.phone_normalized ?? "—"}</span>
              <span>🌐 {r.ip ?? "—"}</span>
              <span>💻 {shortUA(r.user_agent)}</span>
            </div>
            {(r.target_type || r.target_id) && (
              <div className="text-muted-foreground">
                Target: {r.target_type ?? ""} {r.target_id ?? ""}
              </div>
            )}
            {r.metadata && Object.keys(r.metadata).length > 0 && (
              <details className="text-muted-foreground">
                <summary className="cursor-pointer">Details</summary>
                <pre className="whitespace-pre-wrap text-[10px] mt-1">
                  {JSON.stringify(r.metadata, null, 2)}
                </pre>
              </details>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
