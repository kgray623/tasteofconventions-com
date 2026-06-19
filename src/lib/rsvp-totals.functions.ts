import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RsvpTotalsResult = {
  event: {
    requested: number;
    confirmed: number; // in-person people
    virtual: number;   // zoom people
  };
  mine: {
    requested: number;
    uploaded: number;
    confirmed: number;
    virtual: number;
    pendingRequest: number | null;
    inviterIds: string[];
  } | null;
};

const digitsOnly = (s: string | null | undefined) =>
  (s ?? "").replace(/\D/g, "");
const normName = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z]/g, "");

export const getRsvpTotals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { includePersonal?: boolean } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<RsvpTotalsResult> => {
    const { supabase, userId } = context;

    const [invitersRes, rsvpsRes, invitationsRes] = await Promise.all([
      supabase
        .from("inviters")
        .select("id,host_id,quota,active,requested_quota,phone,name"),
      supabase
        .from("rsvps")
        .select("party_size,status,invitation_id,attendance_mode"),
      supabase
        .from("invitations")
        .select("id,host_id,guest_name,guest_email_normalized,guest_phone_normalized"),
    ]);
    const inviterRows = invitersRes.data ?? [];
    const rsvpRows = rsvpsRes.data ?? [];
    const invitationRows = (invitationsRes.data ?? []) as Array<{
      id: string;
      host_id: string | null;
      guest_name: string | null;
      guest_email_normalized: string | null;
      guest_phone_normalized: string | null;
    }>;

    const requested = inviterRows.reduce(
      (sum, r) => sum + (r.active === false ? 0 : r.quota ?? 0),
      0,
    );

    // Build the same duplicate groups the admin upload page uses, so
    // Monahan/Monaghan-style pairs collapse into one confirmation.
    const normNameKey = (s: string | null | undefined) =>
      (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const keyToGroup = new Map<string, string>();
    const idToGroup = new Map<string, string>();
    for (const inv of invitationRows) {
      const keys: string[] = [];
      const n = normNameKey(inv.guest_name);
      const e = (inv.guest_email_normalized ?? "").trim().toLowerCase();
      const p = (inv.guest_phone_normalized ?? "").replace(/\D/g, "");
      if (n) keys.push("n:" + n);
      if (e) keys.push("e:" + e);
      if (p && p.length >= 7) keys.push("p:" + p.slice(-10));
      let groupId: string | null = null;
      for (const k of keys) {
        const existing = keyToGroup.get(k);
        if (existing) { groupId = existing; break; }
      }
      if (!groupId) groupId = inv.id;
      for (const k of keys) keyToGroup.set(k, groupId);
      idToGroup.set(inv.id, groupId);
    }

    // Index RSVPs by invitation id (one row per invitation in practice).
    const rsvpByInvitation = new Map<string, { status: string | null; party_size: number; attendance_mode: string | null }>();
    for (const r of rsvpRows) {
      if (!r.invitation_id) continue;
      rsvpByInvitation.set(r.invitation_id, {
        status: r.status ?? null,
        party_size: r.party_size ?? 1,
        attendance_mode: r.attendance_mode ?? null,
      });
    }

    // Best RSVP per group (yes > waitlist > maybe > no; tie-break on larger party).
    const rank = (status: string | null) =>
      status === "yes" ? 4 : status === "waitlist" ? 3 : status === "maybe" ? 2 : status === "no" ? 1 : 0;
    type Best = { status: string | null; party_size: number; attendance_mode: string | null; hostIds: Set<string> };
    const groupBest = new Map<string, Best>();
    for (const inv of invitationRows) {
      const gid = idToGroup.get(inv.id)!;
      const r = rsvpByInvitation.get(inv.id);
      const cand = {
        status: r?.status ?? null,
        party_size: r?.party_size ?? 1,
        attendance_mode: r?.attendance_mode ?? null,
      };
      const current = groupBest.get(gid);
      if (!current) {
        groupBest.set(gid, { ...cand, hostIds: new Set(inv.host_id ? [inv.host_id] : []) });
      } else {
        if (inv.host_id) current.hostIds.add(inv.host_id);
        if (
          rank(cand.status) > rank(current.status) ||
          (rank(cand.status) === rank(current.status) && cand.party_size > current.party_size)
        ) {
          current.status = cand.status;
          current.party_size = cand.party_size;
          current.attendance_mode = cand.attendance_mode;
        }
      }
    }

    let confirmed = 0;
    let virtual = 0;
    for (const best of groupBest.values()) {
      if (best.status !== "yes") continue;
      if (best.attendance_mode === "zoom") virtual += best.party_size;
      else confirmed += best.party_size;
    }


    let mine: RsvpTotalsResult["mine"] = null;
    if (data.includePersonal) {
      // Resolve "my" host ids by user id + phone tail + display name.
      const { data: authUser } = await supabase.auth.getUser();
      const myPhoneTail = digitsOnly(authUser?.user?.phone).slice(-10);
      let myName = "";
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();
      myName = normName(prof?.display_name);

      const mineHostIds = new Set<string>([userId]);
      const myInviters = inviterRows.filter((r) => {
        if (!r.host_id) return false;
        if (r.host_id === userId) return true;
        const rowTail = digitsOnly(r.phone).slice(-10);
        if (myPhoneTail && rowTail && rowTail === myPhoneTail) return true;
        if (myName && normName(r.name) === myName) return true;
        return false;
      });
      myInviters.forEach((r) => r.host_id && mineHostIds.add(r.host_id));

      const hostIdArr = Array.from(mineHostIds);
      const { data: myInvites } = await supabase
        .from("invitations")
        .select("id,host_id")
        .in("host_id", hostIdArr);
      const uploaded = (myInvites ?? []).length;
      const myInviteIds = new Set((myInvites ?? []).map((i) => i.id));

      const myConfirmed = inPersonYes
        .filter((r) => myInviteIds.has(r.invitation_id))
        .reduce((s, r) => s + (r.party_size ?? 1), 0);
      const myVirtual = virtualYes
        .filter((r) => myInviteIds.has(r.invitation_id))
        .reduce((s, r) => s + (r.party_size ?? 1), 0);

      // Quota = sum of active inviter rows that map to me.
      const activeMine = myInviters.filter((r) => r.active !== false);
      const myQuota = activeMine.reduce((s, r) => s + (r.quota ?? 0), 0);
      const pendingRequest = activeMine
        .map((r) => r.requested_quota)
        .filter((v): v is number => typeof v === "number")
        .reduce<number | null>((acc, v) => (acc == null ? v : Math.max(acc, v)), null);

      mine = {
        requested: myQuota,
        uploaded,
        confirmed: myConfirmed,
        virtual: myVirtual,
        pendingRequest,
        inviterIds: activeMine.map((r) => r.id),
      };
    }

    return {
      event: { requested, confirmed, virtual },
      mine,
    };
  });

export const requestMoreQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { inviterIds: string[]; amount: number; note?: string }) => {
    if (!Array.isArray(input.inviterIds) || input.inviterIds.length === 0) {
      throw new Error("inviterIds required");
    }
    if (!Number.isFinite(input.amount) || input.amount < 1) {
      throw new Error("amount must be >= 1");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("inviters")
      .update({
        requested_quota: data.amount,
        quota_request_note: data.note?.trim() || null,
        quota_requested_at: new Date().toISOString(),
      })
      .in("id", data.inviterIds);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
