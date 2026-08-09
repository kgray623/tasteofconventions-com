type RsvpStatus = "yes" | "waitlist" | "no" | null;

export type CanonicalCommitteeMember = {
  userId: string;
  name: string;
  phone: string;
  rsvpStatus: RsvpStatus;
};

const nameKey = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z]/g, "");

const phoneKey = (value: string | null | undefined) => {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-10) : "";
};

const statusRank = (status: RsvpStatus) =>
  status === "yes" ? 3 : status === "waitlist" ? 2 : status === "no" ? 1 : 0;

export async function loadCanonicalCommitteeRoster(
  userSupabase: any,
  requesterId: string,
): Promise<{ roster: CanonicalCommitteeMember[]; generatedAt: string }> {
  const { data: requesterRoles } = await userSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", requesterId);
  if (!(requesterRoles ?? []).some((row: any) => row.role === "admin" || row.role === "team")) {
    throw new Error("Forbidden");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: roleRows }, { data: profiles }, { data: inviters }, { data: invitations }, authResult] =
    await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id,role").in("role", ["admin", "team"]),
      supabaseAdmin.from("profiles").select("id,display_name"),
      supabaseAdmin.from("inviters").select("host_id,name,phone,active").eq("active", true),
      supabaseAdmin
        .from("invitations")
        .select("guest_name,guest_phone,guest_phone_normalized,rsvps(status)"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  const profileById = new Map((profiles ?? []).map((row: any) => [row.id, row.display_name as string | null]));
  const inviterByUser = new Map<string, any>();
  for (const row of inviters ?? []) {
    if (row.host_id && !inviterByUser.has(row.host_id)) inviterByUser.set(row.host_id, row);
  }
  const authById = new Map((authResult.data?.users ?? []).map((user: any) => [user.id, user]));
  const humanIds = new Set<string>();
  for (const row of roleRows ?? []) humanIds.add(row.user_id);

  const statusByPhone = new Map<string, RsvpStatus>();
  const statusByName = new Map<string, RsvpStatus>();
  for (const row of invitations ?? []) {
    const joined = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
    const raw = joined?.status;
    const status: RsvpStatus = raw === "yes" || raw === "waitlist" || raw === "no" ? raw : null;
    if (!status) continue;
    const pKey = phoneKey(row.guest_phone_normalized || row.guest_phone);
    const nKey = nameKey(row.guest_name);
    if (pKey && statusRank(status) > statusRank(statusByPhone.get(pKey) ?? null)) statusByPhone.set(pKey, status);
    if (nKey && statusRank(status) > statusRank(statusByName.get(nKey) ?? null)) statusByName.set(nKey, status);
  }

  const roster: CanonicalCommitteeMember[] = [];
  for (const userId of humanIds) {
    const profileName = (profileById.get(userId) ?? "").trim();
    if (/^ai\s+admin$/i.test(profileName)) continue;
    const inviter = inviterByUser.get(userId);
    const authUser = authById.get(userId);
    const name = (inviter?.name ?? profileName ?? "").trim();
    if (!name) continue;
    const phone = String(inviter?.phone ?? authUser?.phone ?? "").trim();
    const pKey = phoneKey(phone);
    const nKey = nameKey(name);
    roster.push({
      userId,
      name,
      phone,
      rsvpStatus: (pKey && statusByPhone.get(pKey)) || (nKey && statusByName.get(nKey)) || null,
    });
  }

  roster.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return { roster, generatedAt: new Date().toISOString() };
}