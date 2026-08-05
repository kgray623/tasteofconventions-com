import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rosterNamesLikelySame } from "@/lib/committee-roster";



const guestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const inputSchema = z.object({
  eventId: z.string().min(1),
  inviterId: z.string().min(1).nullable().optional(),
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
    const digitsOnly = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");
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

    // Referral credit is authoritative. Resolve the linked account owner from
    // the selected inviter, and never allow a committee member to submit under
    // somebody else's inviter record.
    let hostId = userId;
    const inviterId = data.inviterId || null;
    if (inviterId) {
      const { data: inviter } = await supabaseAdmin
        .from("inviters")
        .select("id,name,host_id,phone")
        .eq("id", inviterId)
        .maybeSingle();
      if (!inviter) throw new Error("That committee member was not found.");

      if (!inviter.host_id && !isAdmin) {
        // The roster row exists but was never linked to a sign-in account
        // (common when the phone on the roster has a typo). Claim it for the
        // caller when it plausibly belongs to them, so uploads never dead-end.
        const [{ data: profile }, { data: authUser }] = await Promise.all([
          supabaseAdmin.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
          supabaseAdmin.auth.admin.getUserById(userId),
        ]);
        const callerPhone = digitsOnly(
          authUser?.user?.phone || String(authUser?.user?.user_metadata?.phone || ""),
        );
        const rosterPhone = digitsOnly(inviter.phone);
        const phoneSame =
          callerPhone.length >= 7 &&
          rosterPhone.length >= 7 &&
          callerPhone.slice(-10) === rosterPhone.slice(-10);
        const nameSame = rosterNamesLikelySame(profile?.display_name ?? "", inviter.name ?? "");
        if (!phoneSame && !nameSame) {
          throw new Error("Committee members can only add guests to their own list.");
        }
        await supabaseAdmin.from("inviters").update({ host_id: userId }).eq("id", inviter.id);
        hostId = userId;
      } else {
        if (!isAdmin && inviter.host_id && inviter.host_id !== userId) {
          throw new Error("Committee members can only add guests to their own list.");
        }
        if (inviter.host_id) hostId = inviter.host_id;
      }
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
