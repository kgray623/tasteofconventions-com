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

    // 1) Find an existing auth user by phone in any stored format.
    let userId: string | null = null;
    for (const candidate of [phoneE164, phoneNorm, `+${phoneNorm}`]) {
      if (userId) break;
      const { data: id } = await supabaseAdmin.rpc("get_auth_user_id_by_phone", {
        _phone: candidate,
      });
      userId = (id as string | null) ?? null;
    }

    if (!userId) {
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listErr) throw new Error(listErr.message);
      userId = list.users.find((u) => u.phone && u.phone.replace(/\D/g, "") === phoneNorm)?.id ?? null;
    }

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
        phone: phoneE164,
        password: tempPassword,
        phone_confirm: true,
        user_metadata: { display_name: displayName, phone: data.phone },
      });
      if (createErr) throw new Error(createErr.message);
      userId = created.user?.id ?? null;
      if (!userId) throw new Error("Could not create account");
    }

    // 3) Ensure the account has this phone + a fresh internal password,
    //    then sign in with phone/password to get a real session.
    const sessionPassword = randomPassword();
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      phone: phoneE164,
      phone_confirm: true,
      password: sessionPassword,
    });
    if (updErr) throw new Error(updErr.message);

    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
      phone: phoneE164,
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
