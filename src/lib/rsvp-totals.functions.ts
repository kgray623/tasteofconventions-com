import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

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

export type CommitteeWorkspaceGuest = {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  rsvp_status: string | null;
  party_size: number;
  attendance_mode: string | null;
  responded_at: string | null;
  invited_by: string | null;
  host_id: string;
};

export type CommitteeWorkspaceGuestsResult = {
  guests: CommitteeWorkspaceGuest[];
  myHostIds: string[];
};

const digitsOnly = (s: string | null | undefined) =>
  (s ?? "").replace(/\D/g, "");
const normName = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z]/g, "");

type InviterIdentity = {
  id?: string;
  host_id: string | null;
  phone: string | null;
  name: string | null;
  quota?: number | null;
  active?: boolean | null;
  requested_quota?: number | null;
};

async function resolveMyHostIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  inviterRows: InviterIdentity[],
) {
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

  return { mineHostIds, myInviters };
}

export const getCommitteeWorkspaceGuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommitteeWorkspaceGuestsResult> => {
    const { supabase, userId } = context;

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id")
      .order("starts_at")
      .limit(1);
    if (eventsError) throw new Error(eventsError.message);

    const eventId = events?.[0]?.id;
    if (!eventId) return { guests: [], myHostIds: [userId] };

    const [invitersRes, invitationsRes, rsvpsRes] = await Promise.all([
      supabase.from("inviters").select("host_id,phone,name"),
      supabase
        .from("invitations")
        .select("id,guest_name,guest_phone,guest_email,host_id,created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
      supabase.from("rsvps").select("invitation_id,status,party_size,attendance_mode,responded_at"),
    ]);

    if (invitersRes.error) throw new Error(invitersRes.error.message);
    if (invitationsRes.error) throw new Error(invitationsRes.error.message);
    if (rsvpsRes.error) throw new Error(rsvpsRes.error.message);

    const inviterRows = (invitersRes.data ?? []) as InviterIdentity[];
    const { mineHostIds } = await resolveMyHostIds(supabase, userId, inviterRows);

    const invitationRows = (invitationsRes.data ?? []) as Array<{
      id: string;
      guest_name: string;
      guest_phone: string | null;
      guest_email: string | null;
      host_id: string | null;
    }>;

    const rsvpByInvitation = new Map<string, { status: string | null; party_size: number | null; attendance_mode: string | null; responded_at: string | null }>();
    for (const rsvp of rsvpsRes.data ?? []) {
      if (!rsvp.invitation_id) continue;
      rsvpByInvitation.set(rsvp.invitation_id, {
        status: rsvp.status ?? null,
        party_size: rsvp.party_size ?? 1,
        attendance_mode: rsvp.attendance_mode ?? null,
        responded_at: rsvp.responded_at ?? null,
      });
    }

    const hostIds = Array.from(new Set(invitationRows.map((r) => r.host_id).filter((id): id is string => !!id)));
    const hostNames = new Map<string, string>();
    if (hostIds.length) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,display_name,email")
        .in("id", hostIds);
      if (profilesError) throw new Error(profilesError.message);
      for (const profile of profiles ?? []) {
        const name = (profile.display_name ?? "").trim() || (profile.email ?? "").split("@")[0] || "";
        if (name) hostNames.set(profile.id, name);
      }
    }

    return {
      myHostIds: Array.from(mineHostIds),
      guests: invitationRows.map((row) => {
        const rsvp = rsvpByInvitation.get(row.id);
        return {
          id: row.id,
          guest_name: row.guest_name,
          guest_phone: row.guest_phone,
          guest_email: row.guest_email,
          rsvp_status: rsvp?.status ?? null,
          party_size: rsvp?.party_size ?? 1,
          attendance_mode: rsvp?.attendance_mode ?? null,
          responded_at: rsvp?.responded_at ?? null,
          invited_by: row.host_id ? hostNames.get(row.host_id) ?? null : null,
          host_id: row.host_id ?? "",
        };
      }),
    };
  });

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
      const { mineHostIds, myInviters } = await resolveMyHostIds(supabase, userId, inviterRows);

      const hostIdArr = Array.from(mineHostIds);
      const { data: myInvites } = await supabase
        .from("invitations")
        .select("id,host_id")
        .in("host_id", hostIdArr);
      const uploaded = (myInvites ?? []).length;
      const myInviteIds = new Set((myInvites ?? []).map((i) => i.id));

      // Dedupe my confirmations by group: a group counts as "mine" if any
      // invitation in it belongs to one of my host ids.
      let myConfirmed = 0;
      let myVirtual = 0;
      const seenGroups = new Set<string>();
      for (const invId of myInviteIds) {
        const gid = idToGroup.get(invId);
        if (!gid || seenGroups.has(gid)) continue;
        seenGroups.add(gid);
        const best = groupBest.get(gid);
        if (!best || best.status !== "yes") continue;
        if (best.attendance_mode === "zoom") myVirtual += best.party_size;
        else myConfirmed += best.party_size;
      }

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
          inviterIds: activeMine.map((r) => r.id).filter((id): id is string => !!id),
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
