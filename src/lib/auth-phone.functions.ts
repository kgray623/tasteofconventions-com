import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PhoneLoginInput = z.object({
  phone: z.string().min(7).max(40),
});

function normalizeAuthPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return "";
}

function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64").replace(/[+/=]/g, "x") + "Aa1!";
}

function internalPhoneLoginAddress(phoneNorm: string) {
  return `phone-${phoneNorm}@tasteofconventions.local`;
}

async function findAuthUserByPhoneOrLogin(phoneE164: string, phoneNorm: string, loginAddress: string) {
  for (const candidate of [phoneE164, phoneNorm, `+${phoneNorm}`]) {
    const { data: id } = await supabaseAdmin.rpc("get_auth_user_id_by_phone", {
      _phone: candidate,
    });
    if (id) return id as string;
  }

  for (let page = 1; page <= 25; page += 1) {
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(error.message);
    const owner = list.users.find(
      (u) =>
        (u.phone && u.phone.replace(/\D/g, "") === phoneNorm) ||
        u.email?.toLowerCase() === loginAddress,
    );
    if (owner) return owner.id;
    if (list.users.length < 1000) break;
  }

  return null;
}

/**
 * Phone-only sign-in. The user enters a mobile number, and if the number
 * matches an invitation we issue them a session for that phone-number account.
 */
export const signInWithPhoneOnly = createServerFn({ method: "POST" })
  .inputValidator((d) => PhoneLoginInput.parse(d))
  .handler(async ({ data }) => {
    const phoneE164 = normalizeAuthPhone(data.phone);
    const phoneNorm = data.phone.replace(/\D/g, "");
    if (!phoneE164 || phoneNorm.length < 7) {
      throw new Error("Enter a valid mobile phone number");
    }

    const loginAddress = internalPhoneLoginAddress(phoneNorm);

    // 1) Find an existing auth user by phone in any stored format.
    let userId: string | null = await findAuthUserByPhoneOrLogin(phoneE164, phoneNorm, loginAddress);

    // 2) If no auth user, require the phone be tied to a known person.
    if (!userId) {
      const [{ data: inv }, { data: inviter }, { data: teamInvite }] = await Promise.all([
        supabaseAdmin
          .from("invitations")
          .select("id,guest_name")
          .eq("guest_phone_normalized", phoneNorm)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("inviters")
          .select("id,name,host_id")
          .eq("phone", data.phone)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("team_invites")
          .select("id,name")
          .eq("phone_normalized", phoneNorm)
          .limit(1)
          .maybeSingle(),
      ]);

      if (!inv && !inviter && !teamInvite) {
        throw new Error("We don't have this mobile number on the guest list yet.");
      }

      const displayName = inv?.guest_name || inviter?.name || teamInvite?.name || null;

      const tempPassword = randomPassword();
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: loginAddress,
        phone: phoneE164,
        password: tempPassword,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { display_name: displayName, phone: data.phone },
      });
      if (createErr) {
        if (/phone.*already|email.*already|already.*registered/i.test(createErr.message)) {
          userId = await findAuthUserByPhoneOrLogin(phoneE164, phoneNorm, loginAddress);
        }
        if (!userId) throw new Error(createErr.message);
      } else {
        userId = created.user?.id ?? null;
      }
      if (!userId) throw new Error("Could not create account");
    }

    // 3) Ensure the account has this phone-number login identity + a fresh
    //    internal password, then sign in without calling the disabled phone provider.
    const sessionPassword = randomPassword();
    let { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: loginAddress,
      phone: phoneE164,
      email_confirm: true,
      phone_confirm: true,
      password: sessionPassword,
      user_metadata: { phone: data.phone },
    });
    if (updErr && /phone.*already/i.test(updErr.message)) {
      // Another auth user owns this phone — find them and use that account instead.
      const ownerId = await findAuthUserByPhoneOrLogin(phoneE164, phoneNorm, loginAddress);
      if (ownerId && ownerId !== userId) {
        userId = ownerId;
        const retry = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: loginAddress,
          phone: phoneE164,
          email_confirm: true,
          phone_confirm: true,
          password: sessionPassword,
          user_metadata: { phone: data.phone },
        });
        updErr = retry.error;
      }
    }
    if (updErr) throw new Error(updErr.message);

    // 3b) If this phone is on the team invite list, grant the role and mark accepted.
    const { data: teamInviteRow } = await supabaseAdmin
      .from("team_invites")
      .select("id,role,accepted_at")
      .eq("phone_normalized", phoneNorm)
      .maybeSingle();
    if (teamInviteRow) {
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", teamInviteRow.role)
        .maybeSingle();
      if (!existingRole) {
        await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: teamInviteRow.role });
      }
      if (!teamInviteRow.accepted_at) {
        await supabaseAdmin
          .from("team_invites")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", teamInviteRow.id);
      }
    }

    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
      email: loginAddress,
      password: sessionPassword,
    });
    if (signInErr || !signIn.session) {
      throw new Error(signInErr?.message || "Sign-in failed");
    }

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      user_id: userId,
    };
  });
