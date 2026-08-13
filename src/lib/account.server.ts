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

export async function syncCommitteeRoleForUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  const phoneDigits = digitsOnly(
    authUser.user?.phone || String(authUser.user?.user_metadata?.phone || ""),
  );
  if (phoneDigits.length < 7) return;

  let shouldGrantTeam = false;
  const [{ data: committeeInvitations }, { data: teamInvites }, { data: inviters }] =
    await Promise.all([
      supabaseAdmin
        .from("invitations")
        .select("id,guest_phone_normalized")
        .eq("is_committee", true),
      supabaseAdmin
        .from("team_invites")
        .select("id,role,phone_normalized,accepted_at")
        .is("accepted_at", null),
      supabaseAdmin.from("inviters").select("id,phone,active,host_id").eq("active", true),
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

  const matchingInviters = (inviters ?? []).filter((row: any) =>
    phoneMatches(row.phone, phoneDigits),
  );
  shouldGrantTeam ||= matchingInviters.length > 0;

  const unlinkedInviterIds = matchingInviters
    .filter((row: any) => !row.host_id)
    .map((row: any) => row.id as string);
  if (unlinkedInviterIds.length) {
    await supabaseAdmin.from("inviters").update({ host_id: userId }).in("id", unlinkedInviterIds);
  }

  if (shouldGrantTeam) {
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "team" }, { onConflict: "user_id,role" });
  }
}