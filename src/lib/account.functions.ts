import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type RoleName = "admin" | "team" | "host" | "guest";

function digitsOnly(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function phoneMatches(a: string | null | undefined, b: string | null | undefined) {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (da.length < 7 || db.length < 7) return false;
  return da === db || da.slice(-10) === db.slice(-10);
}

async function syncCommitteeRoleForUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  const phoneDigits = digitsOnly(authUser.user?.phone || String(authUser.user?.user_metadata?.phone || ""));
  if (phoneDigits.length < 7) return;

  let shouldGrantTeam = false;

  const [{ data: committeeInvitations }, { data: teamInvites }, { data: inviters }] = await Promise.all([
    supabaseAdmin
      .from("invitations")
      .select("id,guest_phone_normalized")
      .eq("is_committee", true),
    supabaseAdmin
      .from("team_invites")
      .select("id,role,phone_normalized,accepted_at")
      .is("accepted_at", null),
    supabaseAdmin
      .from("inviters")
      .select("id,phone,active")
      .eq("active", true),
  ]);

  shouldGrantTeam ||= (committeeInvitations ?? []).some((row: any) =>
    phoneMatches(row.guest_phone_normalized, phoneDigits),
  );

  const matchingInviteIds: string[] = [];
  for (const invite of (teamInvites ?? []) as any[]) {
    if (!phoneMatches(invite.phone_normalized, phoneDigits)) continue;
    shouldGrantTeam ||= invite.role === "team" || invite.role === "admin";
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: invite.role as RoleName }, { onConflict: "user_id,role" });
    matchingInviteIds.push(invite.id);
  }

  if (matchingInviteIds.length) {
    await supabaseAdmin
      .from("team_invites")
      .update({ accepted_at: new Date().toISOString() })
      .in("id", matchingInviteIds);
  }

  shouldGrantTeam ||= (inviters ?? []).some((row: any) => phoneMatches(row.phone, phoneDigits));

  if (shouldGrantTeam) {
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "team" }, { onConflict: "user_id,role" });
  }
}

export const ensureMyTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
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
    const isTeamMember = (roles ?? []).some((row: any) => row.role === "admin" || row.role === "team");

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
    const categoryIds = Array.from(new Set((assignments ?? []).map((row: any) => row.category_id).filter(Boolean)));

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
        if (count) categories.push({ category_id: categoryId, name: nameById.get(categoryId) ?? "Category", count });
      }
      categories.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      team,
      categories,
      total: team + categories.reduce((sum, row) => sum + row.count, 0),
    };
  });