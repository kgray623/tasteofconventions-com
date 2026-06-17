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

    const [invitersRes, rsvpsRes] = await Promise.all([
      supabase
        .from("inviters")
        .select("id,host_id,quota,active,requested_quota,phone,name"),
      supabase
        .from("rsvps")
        .select("party_size,status,invitation_id,attendance_mode"),
    ]);
    const inviterRows = invitersRes.data ?? [];
    const rsvpRows = rsvpsRes.data ?? [];

    const requested = inviterRows.reduce(
      (sum, r) => sum + (r.active === false ? 0 : r.quota ?? 0),
      0,
    );
    const yesRsvps = rsvpRows.filter((r) => r.status === "yes");
    const inPersonYes = yesRsvps.filter((r) => r.attendance_mode !== "zoom");
    const virtualYes = yesRsvps.filter((r) => r.attendance_mode === "zoom");
    const confirmed = inPersonYes.reduce((s, r) => s + (r.party_size ?? 1), 0);
    const virtual = virtualYes.reduce((s, r) => s + (r.party_size ?? 1), 0);

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
