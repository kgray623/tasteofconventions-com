import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "team"]);
  if (!data || data.length === 0) throw new Error("Forbidden");
}

export type RsvpFailure = {
  id: string;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
  invited_by_raw: string | null;
  status: string | null;
  party_size: number | null;
  attendance_mode: string | null;
  reason: string | null;
  source: string | null;
};

export type RsvpNeedsReferrer = {
  invitation_id: string;
  guest_name: string;
  guest_phone: string | null;
  invited_by_raw: string | null;
  status: string | null;
  party_size: number | null;
  responded_at: string | null;
};

/** Everything that didn't stick: rejected submissions + replies with no confident referrer. */
export const listRsvpIssues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: logs } = await supabaseAdmin
      .from("audit_log")
      .select("id,created_at,action,target_id,metadata,success")
      .in("action", ["RSVP SUBMIT FAILED", "RSVP REFERRER NEEDS REVIEW"])
      .order("created_at", { ascending: false })
      .limit(200);

    const failures: RsvpFailure[] = (logs ?? [])
      .filter((r) => r.action === "RSVP SUBMIT FAILED")
      .map((r) => {
        const m = (r.metadata ?? {}) as Record<string, any>;
        return {
          id: r.id,
          created_at: r.created_at,
          guest_name: m['guest_name'] ?? null,
          guest_phone: m['guest_phone'] ?? null,
          invited_by_raw: m['invited_by_raw'] ?? null,
          status: m['status'] ?? null,
          party_size: m['party_size'] ?? null,
          attendance_mode: m['attendance_mode'] ?? null,
          reason: m['reason'] ?? null,
          source: m['source'] ?? null,
        };
      });

    const flaggedIds = new Set(
      (logs ?? [])
        .filter((r) => r.action === "RSVP REFERRER NEEDS REVIEW" && r.target_id)
        .map((r) => r.target_id as string),
    );

    // Replies that landed but have no committee member credited.
    const { data: rsvpRows } = await supabaseAdmin
      .from("rsvps")
      .select("invitation_id,status,party_size,invited_by,responded_at")
      .not("status", "is", null)
      .order("responded_at", { ascending: false })
      .limit(1000);

    const invitationIds = [...new Set([...(rsvpRows ?? []).map((r) => r.invitation_id), ...flaggedIds])];
    const { data: invRows } = invitationIds.length
      ? await supabaseAdmin
          .from("invitations")
          .select("id,guest_name,guest_phone,inviter_id")
          .in("id", invitationIds)
      : { data: [] as any[] };

    const invMap = new Map((invRows ?? []).map((i) => [i.id, i]));

    const needsReferrer: RsvpNeedsReferrer[] = (rsvpRows ?? [])
      .filter((r) => {
        const inv = invMap.get(r.invitation_id);
        if (!inv) return false;
        // Once a committee owner is credited (manually or by the guest-name
        // rollup), the reply is resolved — an older "needs review" flag must
        // not keep it in the queue forever.
        return !inv.inviter_id;
      })

      .map((r) => {
        const inv = invMap.get(r.invitation_id)!;
        return {
          invitation_id: r.invitation_id,
          guest_name: inv.guest_name,
          guest_phone: inv.guest_phone ?? null,
          invited_by_raw: r.invited_by ?? null,
          status: r.status ?? null,
          party_size: r.party_size ?? null,
          responded_at: r.responded_at ?? null,
        };
      });

    const { data: inviters } = await supabaseAdmin
      .from("inviters")
      .select("id,name")
      .eq("active", true)
      .order("name");

    return {
      failures,
      needsReferrer,
      inviters: (inviters ?? []).map((i) => ({ id: i.id, name: i.name })),
    };
  });

/** Admin fix-up: credit a reply to the right committee member. */
export const assignRsvpReferrer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ invitationId: z.string().uuid(), inviterId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("invitations")
      .update({ inviter_id: data.inviterId })
      .eq("id", data.invitationId);
    if (error) throw new Error("Could not save that assignment.");

    const { data: readBack } = await supabaseAdmin
      .from("invitations")
      .select("id,inviter_id,inviters(name)")
      .eq("id", data.invitationId)
      .maybeSingle();

    return {
      ok: readBack?.inviter_id === data.inviterId,
      owner: (readBack as any)?.inviters?.name ?? null,
    };
  });

/** Admin fix-up: record a reply that never made it into the system. */
export const recordMissingRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        invitationId: z.string().uuid(),
        status: z.enum(["yes", "no", "maybe", "waitlist"]),
        partySize: z.number().int().min(1).max(20),
        attendanceMode: z.enum(["in_person", "zoom"]),
        invitedBy: z.string().max(200).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("rsvps").upsert(
      {
        invitation_id: data.invitationId,
        status: data.status,
        party_size: data.attendanceMode === "zoom" ? 1 : data.partySize,
        attendance_mode: data.attendanceMode,
        invited_by: data.invitedBy ?? null,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "invitation_id" },
    );
    if (error) throw new Error("Could not save that reply.");

    const { data: readBack } = await supabaseAdmin
      .from("rsvps")
      .select("status,party_size,attendance_mode,invited_by")
      .eq("invitation_id", data.invitationId)
      .maybeSingle();

    return { ok: !!readBack, rsvp: readBack ?? null };
  });
