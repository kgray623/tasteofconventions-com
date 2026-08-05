import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { phoneTail } from "@/lib/phone";

export const RSVP_FEED_SENTINEL = "00000000-0000-0000-0000-000000000002";

export type RsvpNotification = {
  invitation_id: string;
  guest_name: string;
  status: string | null;
  party_size: number;
  attendance_mode: string | null;
  responded_at: string;
  mine: boolean;
  /** Committee member the guest is credited to, if any. */
  inviter_name: string | null;
  /** Exactly what the guest typed for "Who invited you?", if anything. */
  referred_by_text: string | null;
};

export type RsvpNotificationsResult = {
  items: RsvpNotification[];
  count: number;
  isAdmin: boolean;
  lastSeenAt: string | null;
};

/** Cap how far back an unseen feed reaches so a first visit isn't a wall of rows. */
const MAX_LOOKBACK_DAYS = 14;
const MAX_ITEMS = 25;

/**
 * Recent RSVP replies the signed-in user hasn't looked at yet.
 * Admins see every reply; committee members see only their own guests'.
 */
export const getNewRsvpNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, never> | undefined) => input ?? {})
  .handler(async ({ context }): Promise<RsvpNotificationsResult> => {
    const { supabase, userId } = context;

    // Read roles straight from user_roles (authenticated can read their own);
    // the has_role RPC is not executable by signed-in users on this project.
    const [{ data: roleRows }, { data: seenRow }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("chat_last_seen")
        .select("last_seen_at")
        .eq("user_id", userId)
        .eq("chat_kind", "rsvp")
        .eq("chat_id", RSVP_FEED_SENTINEL)
        .maybeSingle(),
    ]);

    const isAdmin = (roleRows ?? []).some((r) => r.role === "admin");

    const lastSeenAt = seenRow?.last_seen_at ?? null;
    const floor = new Date(Date.now() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const since = lastSeenAt && lastSeenAt > floor ? lastSeenAt : floor;

    const { data: rsvpRows, error: rsvpError } = await supabase
      .from("rsvps")
      .select("invitation_id,status,party_size,attendance_mode,responded_at,invited_by")
      .not("responded_at", "is", null)
      .gt("responded_at", since)
      .order("responded_at", { ascending: false })
      .limit(200);

    if (rsvpError) throw new Error("Couldn't load new RSVPs. Please try again.");
    if (!rsvpRows || rsvpRows.length === 0) {
      return { items: [], count: 0, isAdmin, lastSeenAt };
    }

    const invitationIds = Array.from(
      new Set(rsvpRows.map((r) => r.invitation_id).filter((id): id is string => !!id)),
    );
    const { data: invitationRows, error: invitationError } = await supabase
      .from("invitations")
      .select("id,guest_name,host_id,inviter_id")
      .in("id", invitationIds);
    if (invitationError) throw new Error("Couldn't load the guest names for new RSVPs.");

    // Work out which invitations belong to this user (same identity rules the
    // committee workspace uses: own host_id, or an inviter row matched by
    // host_id / phone / display name).
    const normName = (s: string | null | undefined) =>
      (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
    const { data: authUser } = await supabase.auth.getUser();
    const myPhoneTail = phoneTail(authUser?.user?.phone);
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const myName = normName(prof?.display_name);

    const { data: inviterRows } = await supabase.from("inviters").select("id,host_id,phone,name");
    const mineHostIds = new Set<string>([userId]);
    const mineInviterIds = new Set<string>();
    for (const r of inviterRows ?? []) {
      const rowTail = phoneTail(r.phone);
      const isMine =
        (r.host_id && r.host_id === userId) ||
        (!!myPhoneTail && !!rowTail && rowTail === myPhoneTail) ||
        (!!myName && normName(r.name) === myName);
      if (!isMine) continue;
      if (r.host_id) mineHostIds.add(r.host_id);
      if (r.id) mineInviterIds.add(r.id);
    }

    const invitationById = new Map((invitationRows ?? []).map((row) => [row.id, row] as const));

    // Names for the "Referred by" line: inviter_id is the authority, host_id is
    // the fallback for older rows that were never linked to a roster row.
    const inviterNameById = new Map<string, string | null>();
    const inviterNameByHost = new Map<string, string | null>();
    for (const r of inviterRows ?? []) {
      if (r.id) inviterNameById.set(r.id, r.name ?? null);
      if (r.host_id && !inviterNameByHost.has(r.host_id)) {
        inviterNameByHost.set(r.host_id, r.name ?? null);
      }
    }

    const items: RsvpNotification[] = [];
    for (const r of rsvpRows) {
      if (!r.invitation_id || !r.responded_at) continue;
      const inv = invitationById.get(r.invitation_id);
      if (!inv) continue;
      // Referral credit is authoritative. host_id is only a compatibility
      // fallback for historical rows that have not yet been credited.
      const mine = inv.inviter_id
        ? mineInviterIds.has(inv.inviter_id)
        : inv.host_id
          ? mineHostIds.has(inv.host_id)
          : false;
      if (!isAdmin && !mine) continue;
      const inviterName =
        (inv.inviter_id ? inviterNameById.get(inv.inviter_id) : null) ??
        (inv.host_id ? inviterNameByHost.get(inv.host_id) : null) ??
        null;
      const typed = (r.invited_by ?? "").trim();
      items.push({
        invitation_id: inv.id,
        guest_name: inv.guest_name,
        status: r.status ?? null,
        party_size: Number(r.party_size ?? 1) || 1,
        attendance_mode: r.attendance_mode ?? null,
        responded_at: r.responded_at,
        mine,
        inviter_name: inviterName,
        referred_by_text: typed.length > 0 ? typed : null,
      });

      if (items.length >= MAX_ITEMS) break;
    }

    return { items, count: items.length, isAdmin, lastSeenAt };
  });
