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
    .insert({ name: data.name, phone: data.phone, quota: 40, active: true });
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
    return { ok: true };
  });

export const getSignedUpPhoneDigits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).userId as string | undefined;
    if (!userId) throw new Error("Not authenticated");
    await assertAdmin(userId);
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    const digits = (data?.users ?? [])
      .map((u) => normalizePhone(u.phone ?? ""))
      .filter((d) => d.length >= 7);
    return { digits };
  });
