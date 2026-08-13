import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type RoleName = "admin" | "team" | "host" | "guest";

export const ensureMyTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { syncCommitteeRoleForUser } = await import("@/lib/account.server");
    await syncCommitteeRoleForUser(context.userId);
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return { roles: (data ?? []).map((r: any) => r.role as RoleName) };
  });

export const getMyChatUnread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const teamSentinel = "00000000-0000-0000-0000-000000000001";

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isTeamMember = (roles ?? []).some(
      (row: any) => row.role === "admin" || row.role === "team",
    );

    let team = 0;
    if (isTeamMember) {
      const { data: seen } = await supabaseAdmin
        .from("chat_last_seen")
        .select("last_seen_at")
        .eq("user_id", userId)
        .eq("chat_kind", "team")
        .eq("chat_id", teamSentinel)
        .maybeSingle();
      const { count } = await supabaseAdmin
        .from("team_messages")
        .select("id", { count: "exact", head: true })
        .neq("user_id", userId)
        .gt("created_at", seen?.last_seen_at ?? "1970-01-01T00:00:00.000Z");
      team = count ?? 0;
    }

    const { data: assignments } = await supabaseAdmin
      .from("category_assignments")
      .select("category_id")
      .eq("user_id", userId);
    const categoryIds = Array.from(
      new Set((assignments ?? []).map((row: any) => row.category_id).filter(Boolean)),
    );

    const categories: { category_id: string; name: string; count: number }[] = [];
    if (categoryIds.length) {
      const [{ data: categoryRows }, { data: seenRows }] = await Promise.all([
        supabaseAdmin.from("categories").select("id,name").in("id", categoryIds),
        supabaseAdmin
          .from("chat_last_seen")
          .select("chat_id,last_seen_at")
          .eq("user_id", userId)
          .eq("chat_kind", "category")
          .in("chat_id", categoryIds),
      ]);
      const nameById = new Map((categoryRows ?? []).map((row: any) => [row.id, row.name]));
      const seenById = new Map((seenRows ?? []).map((row: any) => [row.chat_id, row.last_seen_at]));

      for (const categoryId of categoryIds) {
        const { count } = await supabaseAdmin
          .from("category_messages")
          .select("id", { count: "exact", head: true })
          .eq("category_id", categoryId)
          .neq("user_id", userId)
          .gt("created_at", seenById.get(categoryId) ?? "1970-01-01T00:00:00.000Z");
        if (count)
          categories.push({
            category_id: categoryId,
            name: nameById.get(categoryId) ?? "Category",
            count,
          });
      }
      categories.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      team,
      categories,
      total: team + categories.reduce((sum, row) => sum + row.count, 0),
    };
  });
