import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const PhoneLoginInput = z.object({
  phone: z.string().min(7).max(40),
  name: z.string().min(2).max(120),
});
const SERVER_REMEMBERED_PHONE_COOKIE = "taste_of_conventions_phone_login";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type PhoneSessionResult = {
  access_token: string;
  refresh_token: string;
  user_id: string;
  phone_normalized: string;
};

class ExpectedPhoneLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpectedPhoneLoginError";
  }
}

function isExpectedPhoneLoginError(error: unknown): error is Error {
  return error instanceof ExpectedPhoneLoginError || (
    error instanceof Error && error.name === "ExpectedPhoneLoginError"
  );
}

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

function serverCookieSecurityAttributes() {
  try {
    const protocol = new URL(getRequest().url).protocol;
    if (protocol === "https:") return "; Secure; SameSite=None; Partitioned";
  } catch {
    // Fall back to localhost-friendly cookies in development.
  }
  return "; SameSite=Lax";
}

function setServerRememberedPhoneCookie(phoneNorm: string) {
  if (!/^\d{7,15}$/.test(phoneNorm)) return;
  setResponseHeader(
    "Set-Cookie",
    `${SERVER_REMEMBERED_PHONE_COOKIE}=${encodeURIComponent(phoneNorm)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; HttpOnly${serverCookieSecurityAttributes()}`,
  );
}

function clearServerRememberedPhoneCookie() {
  setResponseHeader(
    "Set-Cookie",
    `${SERVER_REMEMBERED_PHONE_COOKIE}=; Path=/; Max-Age=0; HttpOnly${serverCookieSecurityAttributes()}`,
  );
}

function getServerRememberedPhoneCookie() {
  const cookieHeader = getRequest().headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SERVER_REMEMBERED_PHONE_COOKIE}=`));
  if (!match) return null;
  const raw = match.slice(SERVER_REMEMBERED_PHONE_COOKIE.length + 1);
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // Keep the raw cookie value if decoding fails.
  }
  const digits = value.replace(/\D/g, "");
  return /^\d{7,15}$/.test(digits) ? digits : null;
}

async function findAuthUserByPhoneOrLogin(supabaseAdmin: any, phoneE164: string, phoneNorm: string, loginAddress: string) {
  // Digits-only RPC handles every stored format ("+18082787562", "18082787562", "8082787562").
  const { data: digitsId, error: digitsErr } = await supabaseAdmin.rpc(
    "get_auth_user_id_by_phone_digits",
    { _digits: phoneNorm },
  );
  if (digitsErr) console.error("get_auth_user_id_by_phone_digits failed:", digitsErr);
  if (digitsId) return digitsId as string;

  // Legacy exact-match RPC (kept as belt-and-suspenders).
  for (const candidate of [phoneE164, phoneNorm, `+${phoneNorm}`]) {
    const { data: id } = await supabaseAdmin.rpc("get_auth_user_id_by_phone", {
      _phone: candidate,
    });
    if (id) return id as string;
  }

  // Last-resort scan via admin API in case RPC permissions ever drift again.
  for (let page = 1; page <= 25; page += 1) {
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      console.error("listUsers failed:", error);
      break;
    }
    const owner = list.users.find((u: { phone?: string | null; email?: string | null; id: string }) => {
      const stored = (u.phone || "").replace(/\D/g, "");
      return (
        stored === phoneNorm ||
        (stored.length >= 10 && phoneNorm.length >= 10 && stored.slice(-10) === phoneNorm.slice(-10)) ||
        u.email?.toLowerCase() === loginAddress
      );
    });
    if (owner) return owner.id;
    if (list.users.length < 1000) break;
  }

  return null;
}

function nameTokens(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 2);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1]
        ? prevDiag
        : 1 + Math.min(prevDiag, prev[j], prev[j - 1]);
      prevDiag = tmp;
    }
  }
  return prev[b.length];
}

function tokensFuzzyEqual(a: string, b: string): boolean {
  if (a === b) return true;
  // One of the names contains the other (e.g. "salis" vs "salisbury") — accept.
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;
  const longer = Math.max(a.length, b.length);
  // Allow 1 typo for short tokens (4–5 chars) and 2 typos for longer ones.
  const tolerance = longer >= 6 ? 2 : longer >= 4 ? 1 : 0;
  if (tolerance === 0) return false;
  return levenshtein(a, b) <= tolerance;
}

function namesMatch(input: string, candidates: Array<string | null | undefined>): boolean {
  const inputTokens = nameTokens(input);
  if (inputTokens.length === 0) return false;
  for (const c of candidates) {
    const cand = nameTokens(c);
    for (const t of cand) {
      for (const it of inputTokens) {
        if (tokensFuzzyEqual(it, t)) return true;
      }
    }
  }
  return false;
}


async function recordAuthAudit(
  supabaseAdmin: any,
  params: {
    userId?: string | null;
    phoneNorm: string;
    displayName: string | null;
    success: boolean;
    reason?: string;
    action?: string;
  },
) {
  try {
    const req = getRequest();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      null;
    const ua = req.headers.get("user-agent") || null;
    await supabaseAdmin.from("audit_log").insert({
      user_id: params.userId ?? null,
      phone_normalized: params.phoneNorm,
      display_name: params.displayName,
      action: params.action ?? (params.success ? "auth.login.success" : "auth.login.failure"),
      target_type: "auth",
      ip,
      user_agent: ua,
      success: params.success,
      metadata: params.reason ? { reason: params.reason } : {},
    });
  } catch (err) {
    console.error("audit_log insert failed:", err);
  }
}

async function issuePhoneSession(rawPhone: string, rawName: string): Promise<PhoneSessionResult> {
  const phoneE164 = normalizeAuthPhone(rawPhone);
  const phoneNorm = rawPhone.replace(/\D/g, "");
  if (!phoneE164 || phoneNorm.length < 7) {
    throw new ExpectedPhoneLoginError("Enter a valid mobile phone number");
  }
  if (nameTokens(rawName).length === 0) {
    throw new ExpectedPhoneLoginError("Enter your name as it appears on the invitation");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const loginAddress = internalPhoneLoginAddress(phoneNorm);

  // Look up every record tied to this phone so we can verify the name matches.
  // Match by full normalized digits OR by last 10 digits to tolerate stored
  // formats like "+18082787562", "18082787562", or "8082787562".
  const tail10 = phoneNorm.slice(-10);
  const phoneOrFilter = [
    `guest_phone_normalized.eq.${phoneNorm}`,
    `guest_phone_normalized.eq.${tail10}`,
    `guest_phone_normalized.eq.1${tail10}`,
    `guest_phone_normalized.like.%${tail10}`,
  ].join(",");
  const teamOrFilter = [
    `phone_normalized.eq.${phoneNorm}`,
    `phone_normalized.eq.${tail10}`,
    `phone_normalized.eq.1${tail10}`,
    `phone_normalized.like.%${tail10}`,
  ].join(",");
  const [{ data: invList }, { data: inviterList }, { data: teamInviteList }] = await Promise.all([
    supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_phone_normalized")
      .or(phoneOrFilter)
      .limit(5),
    supabaseAdmin
      .from("inviters")
      .select("id,name,host_id,phone")
      .limit(2000),
    supabaseAdmin
      .from("team_invites")
      .select("id,name,phone_normalized")
      .or(teamOrFilter)
      .limit(5),
  ]);
  const inv = (invList ?? [])[0] ?? null;
  const teamInvite = (teamInviteList ?? [])[0] ?? null;
  const inviter = (inviterList ?? []).find((r: { phone?: string | null }) => {
    const d = (r.phone ?? "").replace(/\D/g, "");
    return d === phoneNorm || (d.length >= 10 && tail10.length === 10 && d.slice(-10) === tail10);
  }) ?? null;

  const candidateNames = [inv?.guest_name, inviter?.name, teamInvite?.name];
  if (!inv && !inviter && !teamInvite) {
    await recordAuthAudit(supabaseAdmin, {
      phoneNorm,
      displayName: rawName,
      success: false,
      reason: "phone_not_on_list",
    });
    throw new ExpectedPhoneLoginError("We don't have this mobile number on the guest list yet. Double-check the digits, or contact your inviter.");
  }
  if (!namesMatch(rawName, candidateNames)) {
    await recordAuthAudit(supabaseAdmin, {
      phoneNorm,
      displayName: rawName,
      success: false,
      reason: "name_mismatch",
    });
    throw new ExpectedPhoneLoginError("This phone number IS on the list — but the last name you entered doesn't match how it's spelled on the invitation. Try a different spelling.");
  }

  const displayName = inv?.guest_name || inviter?.name || teamInvite?.name || rawName;

  // 1) Find an existing auth user by phone in any stored format.
  let userId: string | null = await findAuthUserByPhoneOrLogin(supabaseAdmin, phoneE164, phoneNorm, loginAddress);

  // 2) If no auth user, create one (phone is on the guest list and name matched).
  if (!userId) {
    const tempPassword = randomPassword();
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: loginAddress,
      phone: phoneE164,
      password: tempPassword,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { display_name: displayName, phone: rawPhone },
    });
    if (createErr) {
      if (/phone.*already|email.*already|already.*registered/i.test(createErr.message)) {
        userId = await findAuthUserByPhoneOrLogin(supabaseAdmin, phoneE164, phoneNorm, loginAddress);
      }
      if (!userId) throw new Error(createErr.message);
    } else {
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("Could not create account");
  }

  // 3) Create a server-issued session without rotating the hidden password.
  // Rotating passwords invalidates existing refresh tokens, which was logging
  // people out while they were working in another tab or device.
  const { data: authUser, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (authUserErr || !authUser.user) throw new Error(authUserErr?.message || "Could not find account");
  let signInEmail = authUser.user.email || loginAddress;
  if (!authUser.user.email) {
    const { data: updated, error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: loginAddress,
      phone: phoneE164,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { ...authUser.user.user_metadata, phone: rawPhone },
    });
    if (updErr) throw new Error(updErr.message);
    signInEmail = updated.user?.email || loginAddress;
  }

  // 3b) If this phone is on the team invite list or marked as committee on an invitation, grant the team role.
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
  const { data: committeeInvite } = await supabaseAdmin
    .from("invitations")
    .select("id")
    .eq("is_committee", true)
    .or(
      [phoneNorm, phoneNorm.slice(-10), phoneE164.replace(/\D/g, ""), phoneE164.replace(/\D/g, "").slice(-10)]
        .filter(Boolean)
        .map((digits) => `guest_phone_normalized.eq.${digits}`)
        .join(","),
    )
    .limit(1)
    .maybeSingle();
  if (committeeInvite && !teamInviteRow) {
    const { data: existingTeamRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "team")
      .maybeSingle();
    if (!existingTeamRole) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "team" });
    }
  }

  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: signInEmail,
  });
  const tokenHash = link.properties?.hashed_token;
  if (linkErr || !tokenHash) throw new Error(linkErr?.message || "Sign-in failed");

  const url = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: signIn, error: signInErr } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (signInErr || !signIn.session) {
    throw new Error(signInErr?.message || "Sign-in failed");
  }

  await recordAuthAudit(supabaseAdmin, {
    userId,
    phoneNorm,
    displayName,
    success: true,
    action: "auth.login.success",
  });

  return {
    access_token: signIn.session.access_token,
    refresh_token: signIn.session.refresh_token,
    user_id: userId,
    phone_normalized: phoneNorm,
  };
}

/**
 * Phone + name sign-in. The user enters a mobile number and their name as it
 * appears on the invitation; both must match an invited person.
 */
export const signInWithPhoneOnly = createServerFn({ method: "POST" })
  .inputValidator((d) => PhoneLoginInput.parse(d))
  .handler(async ({ data }) => {
    const session = await issuePhoneSession(data.phone, data.name).catch((error) => {
      if (isExpectedPhoneLoginError(error)) {
        return { error: error.message } as const;
      }
      throw error;
    });
    if ("error" in session) return session;
    setServerRememberedPhoneCookie(session.phone_normalized);
    return session;
  });

const RecoveryInput = z.object({ name: z.string().min(2).max(120) });

export const recoverPhoneLoginFromCookie = createServerFn({ method: "POST" })
  .inputValidator((d) => RecoveryInput.parse(d))
  .handler(async ({ data }) => {
    const phone = getServerRememberedPhoneCookie();
    if (!phone) return null;
    try {
      const session = await issuePhoneSession(phone, data.name);
      setServerRememberedPhoneCookie(session.phone_normalized);
      return session;
    } catch {
      clearServerRememberedPhoneCookie();
      return null;
    }
  });

export const clearPhoneLoginCookie = createServerFn({ method: "POST" })
  .handler(async () => {
    clearServerRememberedPhoneCookie();
    return { ok: true };
  });
