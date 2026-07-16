import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const EVENT_ID = "00000000-0000-0000-0000-000000000001";

type RoleKey = "admin" | "committee" | "guest";

const ROLE_CONFIG: Record<RoleKey, {
  phoneE164: string;
  phoneNorm: string;
  displayName: string;
  email: string;
  isCommittee: boolean;
  userRole: "admin" | "team" | null;
  landing: string;
}> = {
  admin: {
    phoneE164: "+15550000001",
    phoneNorm: "15550000001",
    displayName: "AI Admin",
    email: "ai-admin@tasteofconventions.local",
    isCommittee: false,
    userRole: "admin",
    landing: "/admin",
  },
  committee: {
    phoneE164: "+15550000002",
    phoneNorm: "15550000002",
    displayName: "AI Committee",
    email: "ai-committee@tasteofconventions.local",
    isCommittee: true,
    userRole: "team",
    landing: "/admin",
  },
  guest: {
    phoneE164: "+15550000003",
    phoneNorm: "15550000003",
    displayName: "AI Guest",
    email: "ai-guest@tasteofconventions.local",
    isCommittee: false,
    userRole: null,
    landing: "/my-rsvp",
  },
};

async function ensureRoleAccount(role: RoleKey) {
  const cfg = ROLE_CONFIG[role];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1) Find or create the auth user.
  let userId: string | null = null;
  const { data: existingId } = await supabaseAdmin.rpc(
    "get_auth_user_id_by_phone_digits",
    { _digits: cfg.phoneNorm },
  );
  if (existingId) userId = existingId as string;

  if (!userId) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: cfg.email,
      phone: cfg.phoneE164,
      password:
        Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64").replace(/[+/=]/g, "x") + "Aa1!",
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { display_name: cfg.displayName, phone: cfg.phoneE164, ai_test_account: true },
    });
    if (createErr) throw new Error(createErr.message);
    userId = created.user?.id ?? null;
    if (!userId) throw new Error("Could not create AI test account");
  }

  // 2) Ensure invitation row so phone is on the guest list (host_id = self).
  const { data: existingInv } = await supabaseAdmin
    .from("invitations")
    .select("id,is_committee,guest_name")
    .eq("event_id", EVENT_ID)
    .eq("guest_phone_normalized", cfg.phoneNorm)
    .maybeSingle();

  if (!existingInv) {
    await supabaseAdmin.from("invitations").insert({
      event_id: EVENT_ID,
      host_id: userId,
      guest_name: cfg.displayName,
      guest_phone: cfg.phoneE164,
      is_committee: cfg.isCommittee,
    });
  } else if (existingInv.is_committee !== cfg.isCommittee || existingInv.guest_name !== cfg.displayName) {
    await supabaseAdmin
      .from("invitations")
      .update({ is_committee: cfg.isCommittee, guest_name: cfg.displayName })
      .eq("id", existingInv.id);
  }

  // 3) Ensure user_roles row for admin/committee.
  if (cfg.userRole) {
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", cfg.userRole)
      .maybeSingle();
    if (!existingRole) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: cfg.userRole });
    }
  }

  return { userId, cfg };
}

async function issueSessionForUser(email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link.properties?.hashed_token;
  if (linkErr || !tokenHash) throw new Error(linkErr?.message || "Sign-in failed");
  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: signIn, error: signInErr } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (signInErr || !signIn.session) throw new Error(signInErr?.message || "Sign-in failed");
  return {
    access_token: signIn.session.access_token,
    refresh_token: signIn.session.refresh_token,
  };
}

const RoleInput = z.object({ role: z.enum(["admin", "committee", "guest"]) });

export const signInAsAiRole = createServerFn({ method: "POST" })
  .inputValidator((d) => RoleInput.parse(d))
  .handler(async ({ data }) => {
    const { userId, cfg } = await ensureRoleAccount(data.role);
    const session = await issueSessionForUser(cfg.email);
    return {
      ...session,
      user_id: userId,
      role: data.role,
      landing: cfg.landing,
      display_name: cfg.displayName,
      phone: cfg.phoneE164,
    };
  });

export const listAiAccessAccounts = createServerFn({ method: "GET" }).handler(async () => {
  return (Object.keys(ROLE_CONFIG) as RoleKey[]).map((role) => ({
    role,
    displayName: ROLE_CONFIG[role].displayName,
    phone: ROLE_CONFIG[role].phoneE164,
    landing: ROLE_CONFIG[role].landing,
  }));
});
