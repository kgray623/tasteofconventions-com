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

const InviteIdInput = z.object({
  inviteId: z.string().uuid(),
});

async function assertAdmin(userId: string) {
  const { data: rolesRows, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const isAdmin = (rolesRows ?? []).some((r) => r.role === "admin");
  if (!isAdmin) throw new Error("Only admins can manage team invites");
}

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

async function sendTeamInviteEmail({
  inviteId,
  email,
  role,
  inviterName,
  recipientName,
}: {
  inviteId: string;
  email: string;
  role: "team" | "admin";
  inviterName?: string;
  recipientName?: string | null;
}) {
  const origin = process.env.SITE_URL || "https://tasteofconventions.com";
  const signupUrl = `${origin.replace(/\/$/, "")}/auth?mode=signup&email=${encodeURIComponent(email)}`;

  return sendTransactionalEmailServer({
    templateName: "team-invite",
    recipientEmail: email,
    idempotencyKey: `team-invite-${inviteId}-${Date.now()}`,
    templateData: {
      inviterName,
      recipientName,
      role,
      signupUrl,
    },
  });
}

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InviteInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string | undefined;
    if (!userId) throw new Error("Not authenticated");

    await assertAdmin(userId);

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

    const result = await sendTeamInviteEmail({
      inviteId,
      email,
      role: data.role,
      inviterName,
      recipientName: data.name,
    });

    return { ok: true, emailQueued: result.success, reason: result.reason };
  });

export const resendTeamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InviteIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string | undefined;
    if (!userId) throw new Error("Not authenticated");

    await assertAdmin(userId);

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("team_invites")
      .select("id,email,role,name,accepted_at")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (inviteError) throw new Error(inviteError.message);
    if (!invite) throw new Error("Invite not found");
    if (invite.accepted_at) throw new Error("This invite has already been accepted.");

    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name,email")
      .eq("id", userId)
      .maybeSingle();
    const inviterName =
      inviterProfile?.display_name ||
      inviterProfile?.email?.split("@")[0] ||
      undefined;

    const result = await sendTeamInviteEmail({
      inviteId: invite.id,
      email: invite.email.toLowerCase(),
      role: invite.role as "team" | "admin",
      inviterName,
      recipientName: invite.name,
    });

    await supabaseAdmin
      .from("team_invites")
      .update({ created_at: new Date().toISOString(), invited_by: userId })
      .eq("id", invite.id);

    return { ok: true, emailQueued: result.success, reason: result.reason };
  });

export const getTeamInviteEmailStatuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).userId as string | undefined;
    if (!userId) throw new Error("Not authenticated");

    await assertAdmin(userId);

    const { data, error } = await supabaseAdmin
      .from("email_send_log")
      .select("recipient_email,status,error_message,created_at")
      .eq("template_name", "team-invite")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const byEmail: Record<string, { status: string; errorMessage: string | null; createdAt: string }> = {};
    for (const row of data ?? []) {
      const key = row.recipient_email.toLowerCase();
      if (!byEmail[key]) {
        byEmail[key] = {
          status: row.status,
          errorMessage: row.error_message,
          createdAt: row.created_at,
        };
      }
    }
    return byEmail;
  });
