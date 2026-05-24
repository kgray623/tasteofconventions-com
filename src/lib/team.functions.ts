import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendTransactionalEmailServer } from "@/lib/email/send-server";

const InviteInput = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(["team", "admin"]),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(40),
});

async function refreshPendingInvite(
  inviteId: string,
  role: "team" | "admin",
  invitedBy: string,
  name: string,
  phone: string,
) {
  const { error } = await supabaseAdmin
    .from("team_invites")
    .update({ role, invited_by: invitedBy, name, phone, created_at: new Date().toISOString() })
    .eq("id", inviteId);
  if (error) throw new Error(error.message);
  return inviteId;
}

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InviteInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string | undefined;
    if (!userId) throw new Error("Not authenticated");

    // Only admins can invite
    const { data: rolesRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (rolesRows ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Only admins can invite team members");

    const email = data.email.toLowerCase();

    // Reuse existing pending invite (or update role); error only if already accepted.
    // The insert fallback also handles fast repeat clicks where the unique constraint wins the race.
    let inviteId: string;
    const { data: existing } = await supabaseAdmin
      .from("team_invites")
      .select("id,accepted_at")
      .eq("email_normalized", email)
      .maybeSingle();

    if (existing) {
      if (existing.accepted_at) {
        throw new Error("This person has already accepted an invite.");
      }
      inviteId = await refreshPendingInvite(existing.id, data.role, userId, data.name, data.phone);
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("team_invites")
        .insert({ email, role: data.role, invited_by: userId, name: data.name, phone: data.phone })
        .select("id")
        .single();
      if (insertErr) {
        if (insertErr.code !== "23505") throw new Error(insertErr.message);

        const { data: conflicted, error: conflictErr } = await supabaseAdmin
          .from("team_invites")
          .select("id,accepted_at")
          .eq("email_normalized", email)
          .maybeSingle();
        if (conflictErr) throw new Error(conflictErr.message);
        if (!conflicted) throw new Error("Invite already exists, but could not be loaded.");
        if (conflicted.accepted_at) {
          throw new Error("This person has already accepted an invite.");
        }
        inviteId = await refreshPendingInvite(conflicted.id, data.role, userId, data.name, data.phone);
      } else {
        inviteId = inserted.id;
      }
    }

    // Get inviter name for the email
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name,email")
      .eq("id", userId)
      .maybeSingle();
    const inviterName =
      inviterProfile?.display_name ||
      inviterProfile?.email?.split("@")[0] ||
      undefined;

    const origin =
      process.env.SITE_URL ||
      "https://tasteofconventions.com";
    const signupUrl = `${origin.replace(/\/$/, "")}/auth`;

    const result = await sendTransactionalEmailServer({
      templateName: "team-invite",
      recipientEmail: email,
      idempotencyKey: `team-invite-${inviteId}-${Date.now()}`,
      templateData: {
        inviterName,
        role: data.role,
        signupUrl,
      },
    });

    return { ok: true, emailQueued: result.success, reason: result.reason };
  });
