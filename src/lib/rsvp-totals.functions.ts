import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { buildDuplicateGroupIds, computeRsvpRollup } from "@/lib/rsvp-math";
import { phoneTail, normalizePhone } from "@/lib/phone";

/** MEDIUM-003: turn opaque Postgres errors into short, user-facing sentences. */
const friendlyDbError = (context: string, err: { message?: string | null } | null): Error => {
  const raw = err?.message ?? "";
  if (/permission denied|not authorized|rls/i.test(raw)) {
    return new Error(`You don't have access to ${context}. Sign in again or ask an admin.`);
  }
  if (/timeout|network|fetch failed/i.test(raw)) {
    return new Error(`Couldn't reach the database while loading ${context}. Please retry.`);
  }
  return new Error(`Couldn't load ${context}. ${raw || "Please try again."}`.trim());
};


export type RsvpDataQualityIssues = {
  partySizeCoerced: number;
  statusUnknown: number;
  attendanceModeUnknown: number;
};

export type RsvpTotalsResult = {
  event: {
    requested: number;
    uploaded: number;
    confirmed: number; // in-person people (explicit mode)
    confirmedResponses: number;
    inPersonResponses: number;
    inPersonAssumed: number; // yes with unknown attendance mode
    inPersonAssumedResponses: number;
    virtual: number;   // zoom people
    virtualResponses: number;
    dataQuality: RsvpDataQualityIssues;
  };
  mine: {
    requested: number;
    uploaded: number;
    confirmed: number;
    confirmedResponses: number;
    inPersonResponses: number;
    inPersonAssumed: number;
    inPersonAssumedResponses: number;
    virtual: number;
    virtualResponses: number;
    pendingRequest: number | null;
    inviterIds: string[];
    dataQuality: RsvpDataQualityIssues;
  } | null;
};

export type CommitteeWorkspaceGuest = {
  id: string;
  created_at: string | null;
  invite_sent_at: string | null;
  guest_name: string;
  guest_phone: string | null;
  rsvp_status: string | null;
  party_size: number;
  attendance_mode: string | null;
  responded_at: string | null;
  invited_by: string | null;
  host_id: string;
  rsvp_token: string | null;
};

export type CommitteeWorkspaceGuestsResult = {
  guests: CommitteeWorkspaceGuest[];
  myHostIds: string[];
};

export type RsvpEventOption = {
  id: string;
  title: string;
};

type InviterIdentity = {
  id?: string;
  host_id: string | null;
  phone: string | null;
  name: string | null;
  quota?: number | null;
  active?: boolean | null;
  requested_quota?: number | null;
};

export const getRsvpEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, never> | undefined) => input ?? {})
  .handler(async ({ context }): Promise<RsvpEventOption[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("events")
      .select("id,title")
      .order("starts_at");
    if (error) throw friendlyDbError("the event list", error);
    return (data ?? []).map((event) => ({ id: event.id, title: event.title }));
  });

export const getCommitteeWorkspaceGuests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, never> | undefined) => input ?? {})
  .handler(async ({ context }): Promise<CommitteeWorkspaceGuestsResult> => {
    const { supabase, userId } = context;

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id")
      .order("starts_at")
      .limit(1);
    if (eventsError) throw friendlyDbError("the event", eventsError);

    const eventId = events?.[0]?.id;
    if (!eventId) return { guests: [], myHostIds: [userId] };

    const [invitersRes, invitationsRes, rsvpsRes] = await Promise.all([
      supabase.from("inviters").select("host_id,phone,name"),
      supabase
        .from("invitations")
        .select("id,guest_name,guest_phone,host_id,created_at,invite_sent_at,rsvp_token")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
      supabase.from("rsvps").select("invitation_id,status,party_size,attendance_mode,responded_at"),
    ]);

    if (invitersRes.error) throw friendlyDbError("the committee list", invitersRes.error);
    if (invitationsRes.error) throw friendlyDbError("the guest list", invitationsRes.error);
    if (rsvpsRes.error) throw friendlyDbError("the RSVPs", rsvpsRes.error);

    const inviterRows = (invitersRes.data ?? []) as InviterIdentity[];
    const normName = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
    const { data: authUser } = await supabase.auth.getUser();
    const myPhoneTail = phoneTail(authUser?.user?.phone);
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const myName = normName(prof?.display_name);
    const mineHostIds = new Set<string>([userId]);
    inviterRows.forEach((r) => {
      if (!r.host_id) return;
      if (r.host_id === userId) mineHostIds.add(r.host_id);
      const rowTail = phoneTail(r.phone);
      if (myPhoneTail && rowTail && rowTail === myPhoneTail) mineHostIds.add(r.host_id);
      if (myName && normName(r.name) === myName) mineHostIds.add(r.host_id);
    });


    const invitationRows = (invitationsRes.data ?? []) as Array<{
      id: string;
      created_at: string | null;
      invite_sent_at: string | null;
      guest_name: string;
      guest_phone: string | null;
      host_id: string | null;
      rsvp_token: string | null;
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
        .select("id,display_name")
        .in("id", hostIds);
      if (profilesError) throw friendlyDbError("the inviter names", profilesError);
      for (const profile of profiles ?? []) {
        const name = (profile.display_name ?? "").trim();
        if (name) hostNames.set(profile.id, name);
      }
    }

    return {
      myHostIds: Array.from(mineHostIds),
      guests: invitationRows.map((row) => {
        const rsvp = rsvpByInvitation.get(row.id);
        return {
          id: row.id,
          created_at: row.created_at ?? null,
          invite_sent_at: row.invite_sent_at ?? null,
          guest_name: row.guest_name,
          guest_phone: row.guest_phone,
          rsvp_status: rsvp?.status ?? null,
          party_size: rsvp?.party_size ?? 1,
          attendance_mode: rsvp?.attendance_mode ?? null,
          responded_at: rsvp?.responded_at ?? null,
          invited_by: row.host_id ? hostNames.get(row.host_id) ?? null : null,
          host_id: row.host_id ?? "",
          rsvp_token: row.rsvp_token ?? null,
        };
      }),
    };
  });

export const getRsvpTotals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { includePersonal?: boolean; eventId?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<RsvpTotalsResult> => {
    const { supabase, userId } = context;

    let invitationsQuery = supabase
      .from("invitations")
      .select("id,host_id,guest_name,guest_phone_normalized");
    if (data.eventId) invitationsQuery = invitationsQuery.eq("event_id", data.eventId);

    const [invitersRes, rsvpsRes, invitationsRes] = await Promise.all([
      supabase
        .from("inviters")
        .select("id,host_id,quota,active,requested_quota,phone,name"),
      supabase
        .from("rsvps")
        .select("party_size,status,invitation_id,attendance_mode"),
      invitationsQuery,
    ]);
    const inviterRows = invitersRes.data ?? [];
    const rsvpRows = rsvpsRes.data ?? [];
    const invitationRows = (invitationsRes.data ?? []) as Array<{
      id: string;
      host_id: string | null;
      guest_name: string | null;
      guest_phone_normalized: string | null;
    }>;

    const requested = inviterRows.reduce(
      (sum, r) => sum + (r.active === false ? 0 : (r.quota ?? 0)),
      0,
    );


    const idToGroup = buildDuplicateGroupIds(invitationRows.map((inv) => ({
      id: inv.id,
      guest_name: inv.guest_name,
      guest_phone_normalized: inv.guest_phone_normalized,
    })));

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

    const rollup = computeRsvpRollup(invitationRows.map((inv) => {
      const rsvp = rsvpByInvitation.get(inv.id);
      return {
        id: inv.id,
        groupId: idToGroup.get(inv.id) ?? inv.id,
        status: rsvp?.status ?? null,
        party_size: rsvp?.party_size ?? 1,
        attendance_mode: rsvp?.attendance_mode ?? null,
      };
    }));


    let mine: RsvpTotalsResult["mine"] = null;
    if (data.includePersonal) {
      const normName = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
      const { data: authUser } = await supabase.auth.getUser();
      const myPhoneTail = phoneTail(authUser?.user?.phone);
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();
      const myName = normName(prof?.display_name);
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

      const myGroupIds = new Set(
        invitationRows
          .filter((inv) => inv.host_id && mineHostIds.has(inv.host_id))
          .map((inv) => idToGroup.get(inv.id) ?? inv.id),
      );
      const uploaded = invitationRows.filter((inv) => inv.host_id && mineHostIds.has(inv.host_id)).length;
      const myRollup = computeRsvpRollup(invitationRows
        .filter((inv) => myGroupIds.has(idToGroup.get(inv.id) ?? inv.id))
        .map((inv) => {
          const rsvp = rsvpByInvitation.get(inv.id);
          return {
            id: inv.id,
            groupId: idToGroup.get(inv.id) ?? inv.id,
            status: rsvp?.status ?? null,
            party_size: rsvp?.party_size ?? 1,
            attendance_mode: rsvp?.attendance_mode ?? null,
          };
        }));

      // Quota = sum of approved inviter quotas that map to me. Pending
      // requested_quota values are surfaced separately as pendingRequest.
      const activeMine = myInviters.filter((r) => r.active !== false);
      const myQuota = activeMine.reduce((s, r) => s + (r.quota ?? 0), 0);

      const pendingRequest = activeMine
        .map((r) => r.requested_quota)
        .filter((v): v is number => typeof v === "number")
        .reduce<number | null>((acc, v) => (acc == null ? v : Math.max(acc, v)), null);

      mine = {
        requested: myQuota,
        uploaded,
        confirmed: myRollup.people.inPerson,
        confirmedResponses: myRollup.responses.confirmed,
        inPersonResponses: myRollup.responses.inPerson,
        inPersonAssumed: myRollup.people.inPersonAssumed,
        inPersonAssumedResponses: myRollup.responses.inPersonAssumed,
        virtual: myRollup.people.zoom,
        virtualResponses: myRollup.responses.zoom,
        pendingRequest,
        inviterIds: activeMine.map((r) => r.id).filter((id): id is string => !!id),
        dataQuality: myRollup.dataQuality,
      };
    }

    return {
      event: {
        requested,
        uploaded: rollup.responses.uploaded,
        confirmed: rollup.people.inPerson,
        confirmedResponses: rollup.responses.confirmed,
        inPersonResponses: rollup.responses.inPerson,
        inPersonAssumed: rollup.people.inPersonAssumed,
        inPersonAssumedResponses: rollup.responses.inPersonAssumed,
        virtual: rollup.people.zoom,
        virtualResponses: rollup.responses.zoom,
        dataQuality: rollup.dataQuality,
      },
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
