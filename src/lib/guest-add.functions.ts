import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const guestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const inputSchema = z.object({
  eventId: z.string().uuid(),
  inviterId: z.string().uuid().nullable().optional(),
  isCommittee: z.boolean().optional(),
  guests: z.array(guestSchema).min(1).max(500),
});

export type AddGuestResult = {
  ok: boolean;
  id: string | null;
  name: string;
  error: { message: string; code: string } | null;
};

/**
 * Adds guests to the invitation list on behalf of an admin or committee member.
 *
 * Why this exists: the browser cannot insert directly, because the invitations
 * insert policy requires host_id = auth.uid(). Committee roster rows are often
 * owned by whoever created them (an admin), so a committee member adding a guest
 * under their own roster row was always rejected with a generic failure.
 *
 * Here the caller's role is verified server-side, and host_id is derived from
 * the caller (admins may add on behalf of a roster owner), never from client input.
 */
export const addGuests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ results: AddGuestResult[] }> => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleErr) {
      console.error("[guest-add] role lookup failed", roleErr.message);
      throw new Error("Couldn't verify your access. Please sign in again.");
    }
    const roles = new Set((roleRows ?? []).map((r) => r.role as string));
    const isAdmin = roles.has("admin");
    const isTeam = roles.has("team");
    if (!isAdmin && !isTeam) {
      throw new Error("Only admins and committee members can add guests.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ownership: the signed-in user owns the rows they add. Admins may add on
    // behalf of a roster owner (so the guests land in that person's account).
    let hostId = userId;
    const inviterId = data.inviterId || null;
    if (isAdmin && inviterId) {
      const { data: inviter } = await supabaseAdmin
        .from("inviters")
        .select("host_id")
        .eq("id", inviterId)
        .maybeSingle();
      if (inviter?.host_id) hostId = inviter.host_id;
    }

    const results: AddGuestResult[] = [];
    for (const guest of data.guests) {
      const { data: row, error } = await supabaseAdmin
        .from("invitations")
        .insert({
          event_id: data.eventId,
          host_id: hostId,
          guest_name: guest.name,
          guest_phone: guest.phone?.trim() || null,
          notes: guest.notes?.trim() || null,
          is_committee: Boolean(data.isCommittee),
          inviter_id: inviterId,
        })
        .select("id,guest_name")
        .maybeSingle();

      if (error || !row) {
        if (error) console.error("[guest-add] insert failed", error.message);
        results.push({
          ok: false,
          id: null,
          name: guest.name,
          error: {
            message: error?.message ?? "Insert returned no row",
            code: error?.code ?? "",
          },
        });
        continue;
      }
      results.push({ ok: true, id: row.id, name: row.guest_name, error: null });
    }

    return { results };
  });
