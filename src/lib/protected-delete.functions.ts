import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_TABLES = [
  "invitations",
  "rsvps",
  "inviters",
  "team_invites",
  "cuisine_preorders",
] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

const ALLOWED_COLUMNS = ["id", "invitation_id"] as const;
type AllowedColumn = (typeof ALLOWED_COLUMNS)[number];

export type ProtectedDeleteInput = {
  table: AllowedTable;
  column?: AllowedColumn;
  value: string;
  reason: string;
};

export const deleteProtectedRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ProtectedDeleteInput) => {
    if (!ALLOWED_TABLES.includes(d.table)) throw new Error("Table not allowed");
    const column = (d.column ?? "id") as AllowedColumn;
    if (!ALLOWED_COLUMNS.includes(column)) throw new Error("Column not allowed");
    const reason = (d.reason ?? "").trim();
    if (reason.length < 5) throw new Error("Please enter a reason of at least 5 characters.");
    if (!d.value) throw new Error("Missing row id");
    return { table: d.table, column, value: d.value, reason };
  })
  .handler(async ({ data, context }) => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Only administrators can delete records.");

    const { data: n, error } = await context.supabase.rpc("admin_delete_rows" as any, {
      _table: data.table,
      _column: data.column,
      _value: data.value,
      _reason: data.reason,
    });
    if (error) {
      console.error("[protected-delete] rpc error:", error.message);
      throw new Error(error.message || "Delete failed");
    }
    return { ok: true, deleted: (n as number) ?? 0 };
  });
