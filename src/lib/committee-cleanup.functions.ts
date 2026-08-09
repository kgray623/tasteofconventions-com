import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const removeUnverifiedCommitteeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((row) => row.role === "admin")) throw new Error("Forbidden");

    const tirzahInviteId = "bd27931b-9644-4b14-b49e-2a3ff550e061";
    const tirzahInviterId = "e8dfaa04-3b39-4e92-9038-95e13c376d50";
    const { error: deleteError } = await supabaseAdmin.rpc("admin_delete_rows", {
      _table: "team_invites",
      _column: "id",
      _value: tirzahInviteId,
      _reason: "Remove unverified committee entry while retaining guest records",
      _actor_user_id: context.userId,
    });
    if (deleteError) throw new Error(deleteError.message);
    const { error: updateError } = await supabaseAdmin
      .from("inviters")
      .update({ active: false })
      .eq("id", tirzahInviterId);
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });