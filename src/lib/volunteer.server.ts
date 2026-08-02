import type { SupabaseClient } from "@supabase/supabase-js";

export function digitsOnly(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * Resolve the display name for a signed-in user from trusted server-side
 * sources only (profile first, then their invitation row by phone).
 * The browser never supplies the name, so it cannot be spoofed.
 */
export async function resolveVolunteerName(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  const fromProfile = profile?.display_name?.trim();
  if (fromProfile) return fromProfile;

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  const phone = digitsOnly(
    authUser.user?.phone || String(authUser.user?.user_metadata?.phone || ""),
  );
  const metaName = String(authUser.user?.user_metadata?.display_name || "").trim();
  if (metaName) return metaName;
  if (phone.length >= 7) {
    const last10 = phone.slice(-10);
    const { data: invitation } = await supabaseAdmin
      .from("invitations")
      .select("guest_name,guest_phone_normalized")
      .ilike("guest_phone_normalized", `%${last10}`)
      .limit(1)
      .maybeSingle();
    const fromInvitation = invitation?.guest_name?.trim();
    if (fromInvitation) return fromInvitation;
  }
  return null;
}

export async function isAdminUser(supabase: SupabaseClient, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}
