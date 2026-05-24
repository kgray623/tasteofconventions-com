import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendTransactionalEmailServer } from "@/lib/email/send-server";

const InviteInput = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(["team", "admin"]),
});

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

    // Reuse existing pending invite (or update role); error only if already accepted
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
      const { error: updErr } = await supabaseAdmin
        .from("team_invites")
        .update({ role: data.role, invited_by: userId, created_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      inviteId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("team_invites")
        .insert({ email, role: data.role, invited_by: userId })
        .select("id")
        .single();
      if (insertErr) throw new Error(insertErr.message);
      inviteId = inserted.id;
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
      idempotencyKey: `team-invite-${invite.id}`,
      templateData: {
        inviterName,
        role: data.role,
        signupUrl,
      },
    });

    return { ok: true, emailQueued: result.success, reason: result.reason };
  });
