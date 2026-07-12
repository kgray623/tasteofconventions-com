import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InviteInput = z.object({
  role: z.enum(["team", "admin"]),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(40),
});

function normalizePhone(p: string): string {
  return p.replace(/\D/g, "");
}

async function assertAdmin(userId: string) {
  const { data: rolesRows, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const isAdmin = (rolesRows ?? []).some((r) => r.role === "admin");
  if (!isAdmin) throw new Error("Only admins can manage team invites");
}

async function syncCommitteeInviter(data: z.infer<typeof InviteInput>) {
  if (data.role !== "team") return;
  const phoneNorm = normalizePhone(data.phone);
  const { data: inviters, error: readErr } = await supabaseAdmin
    .from("inviters")
    .select("id,phone");
  if (readErr) throw new Error(readErr.message);

  const existing = (inviters ?? []).find((row) => normalizePhone(row.phone ?? "") === phoneNorm);
  if (existing) {
    const { error } = await supabaseAdmin
      .from("inviters")
      .update({ name: data.name, phone: data.phone, active: true })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabaseAdmin
    .from("inviters")
    .insert({ name: data.name, phone: data.phone, quota: 0, active: true });
  if (error) throw new Error(error.message);
}

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InviteInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string | undefined;
    if (!userId) throw new Error("Not authenticated");

    await assertAdmin(userId);

    const phoneNorm = normalizePhone(data.phone);
    if (phoneNorm.length < 7) throw new Error("Enter a valid phone number");

    // Reuse pending invite matching this phone; error if already accepted.
    const { data: existing } = await supabaseAdmin
      .from("team_invites")
      .select("id,accepted_at")
      .eq("phone_normalized", phoneNorm)
      .maybeSingle();

    if (existing) {
      if (existing.accepted_at) {
        throw new Error("This person has already accepted an invite.");
      }
      const { error: updErr } = await supabaseAdmin
        .from("team_invites")
        .update({
          role: data.role,
          invited_by: userId,
          name: data.name,
          phone: data.phone,
          created_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      await syncCommitteeInviter(data);
      await flagInvitationsAsCommittee(data);
      return { ok: true };
    }

    const { error: insErr } = await supabaseAdmin
      .from("team_invites")
      .insert({
        role: data.role,
        invited_by: userId,
        name: data.name,
        phone: data.phone,
      });
    if (insErr) throw new Error(insErr.message);
    await syncCommitteeInviter(data);
    await flagInvitationsAsCommittee(data);
    return { ok: true };
  });

async function flagInvitationsAsCommittee(data: z.infer<typeof InviteInput>) {
  if (data.role !== "team") return;
  const phoneNorm = normalizePhone(data.phone);
  if (phoneNorm.length < 7) return;
  const tail = phoneNorm.slice(-10);
  const { data: rows, error } = await supabaseAdmin
    .from("invitations")
    .select("id,guest_phone_normalized,is_committee");
  if (error) return;
  const ids = (rows ?? [])
    .filter((r) => {
      const d = (r.guest_phone_normalized ?? "").replace(/\D/g, "");
      return d.length >= 7 && d.slice(-10) === tail && !r.is_committee;
    })
    .map((r) => r.id);
  if (ids.length === 0) return;
  await supabaseAdmin.from("invitations").update({ is_committee: true }).in("id", ids);
}

export const removeTeamInvitesForPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { phone: string }) => ({ phone: String(d.phone ?? "") }))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string | undefined;
    if (!userId) throw new Error("Not authenticated");
    await assertAdmin(userId);
    const phoneNorm = normalizePhone(data.phone);
    if (phoneNorm.length < 7) return { ok: true, removed: 0 };
    const tail = phoneNorm.slice(-10);
    const { data: rows } = await supabaseAdmin
      .from("team_invites")
      .select("id,phone_normalized,accepted_at");
    const ids = (rows ?? [])
      .filter((r) => !r.accepted_at && (r.phone_normalized ?? "").slice(-10) === tail)
      .map((r) => r.id);
    if (ids.length === 0) return { ok: true, removed: 0 };
    const { error } = await supabaseAdmin.from("team_invites").delete().in("id", ids);
    if (error) throw new Error(error.message);
    return { ok: true, removed: ids.length };
  });


export const getSignedUpPhoneDigits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).userId as string | undefined;
    if (!userId) throw new Error("Not authenticated");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const ok = (roles ?? []).some((r) => r.role === "admin" || r.role === "team");
    if (!ok) throw new Error("Forbidden");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    const digits = (data?.users ?? [])
      .map((u) => normalizePhone(u.phone ?? ""))
      .filter((d) => d.length >= 7);
    return { digits };
  });
