import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { digitsOnly } from "@/lib/phone";

export type GuestEditScope = { isAdmin: boolean; inviterIds: string[] };

/**
 * Admins may edit every guest. Committee (team) members may edit only the
 * guests that sit under their own inviter record(s) or that they created.
 */
async function resolveScope(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<GuestEditScope> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "team"]);
  if (!roles || roles.length === 0) throw new Error("Forbidden");
  const isAdmin = roles.some((r) => r.role === "admin");
  if (isAdmin) return { isAdmin: true, inviterIds: [] };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: mine } = await supabaseAdmin
    .from("inviters")
    .select("id")
    .eq("host_id", userId);
  return { isAdmin: false, inviterIds: (mine ?? []).map((r) => r.id) };
}

async function assertCanEdit(
  scope: GuestEditScope,
  invitationId: string,
  userId: string,
) {
  if (scope.isAdmin) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: inv } = await supabaseAdmin
    .from("invitations")
    .select("id,inviter_id,host_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) throw new Error("That guest no longer exists.");
  const ownsByInviter = !!inv.inviter_id && scope.inviterIds.includes(inv.inviter_id);
  const ownsByHost = inv.host_id === userId;
  if (!ownsByInviter && !ownsByHost) {
    throw new Error("That guest is not on your list, so you cannot edit them.");
  }
}

/** Who is acting, for the audit trail. */
async function actorLabel(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name,email")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name || data?.email || userId;
}

/** Editable scope of the caller, so the roster can hide what they cannot touch. */
export const getGuestEditScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await resolveScope(context.supabase, context.userId);
    return scope;
  });

const EditInput = z.object({
  invitationId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40),
  status: z.enum(["yes", "no", "maybe", "waitlist", "pending"]),
  partySize: z.number().int().min(0).max(50),
  attendanceMode: z.enum(["in_person", "zoom"]),
  reason: z.string().trim().max(500).optional(),
  /** Required when the change affects a guest who already has meals recorded. */
  confirmMealImpact: z.boolean().optional(),
});

/**
 * Edit a guest's identity and RSVP on their behalf. Never deletes the guest,
 * never touches meal orders or payments, and always reads the row back
 * before reporting success.
 */
export const updateGuestRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => EditInput.parse(d))
  .handler(async ({ data, context }) => {
    const scope = await resolveScope(context.supabase, context.userId);
    await assertCanEdit(scope, data.invitationId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: beforeInv } = await supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_phone")
      .eq("id", data.invitationId)
      .maybeSingle();
    if (!beforeInv) throw new Error("That guest no longer exists.");

    const { data: beforeRsvp } = await supabaseAdmin
      .from("rsvps")
      .select("id,status,party_size,attendance_mode,ordering_food,invited_by,responded_at")
      .eq("invitation_id", data.invitationId)
      .maybeSingle();

    // Meals are never changed here, but a guest who is being marked declined or
    // moved to Zoom while holding meals needs an explicit acknowledgement.
    const { data: preorder } = await supabaseAdmin
      .from("cuisine_preorders")
      .select("id,selections")
      .eq("invitation_id", data.invitationId)
      .maybeSingle();
    const mealQty: number = Array.isArray(preorder?.selections)
      ? (preorder!.selections as unknown[]).reduce<number>((sum, item) => {
          const qty = Number((item as { qty?: unknown })?.qty ?? 0);
          return sum + (Number.isFinite(qty) ? qty : 0);
        }, 0)
      : 0;
    const leavingInPerson =
      (data.status !== "yes" && beforeRsvp?.status === "yes") ||
      (data.attendanceMode === "zoom" && beforeRsvp?.attendance_mode !== "zoom");
    if (mealQty > 0 && leavingInPerson && !data.confirmMealImpact) {
      return {
        ok: false as const,
        needsMealConfirm: true as const,
        mealQty,
        message: `This guest has ${mealQty} meal${mealQty === 1 ? "" : "s"} on order. Their meals stay on the restaurant list until you cancel them separately — confirm to save the RSVP change anyway.`,
      };
    }

    const phoneTrimmed = data.phone.trim();
    const { error: invError } = await supabaseAdmin
      .from("invitations")
      .update({
        guest_name: data.name.trim(),
        guest_phone: phoneTrimmed || null,
        guest_phone_normalized: phoneTrimmed ? digitsOnly(phoneTrimmed) : null,
      })
      .eq("id", data.invitationId);
    if (invError) throw new Error("Could not save the guest's name or phone.");

    if (data.status === "pending") {
      // Keep the row; clear the reply so the roster shows "no reply yet".
      if (beforeRsvp) {
        const { error } = await supabaseAdmin
          .from("rsvps")
          .update({ status: "pending", responded_at: null })
          .eq("invitation_id", data.invitationId);
        if (error) throw new Error("Could not clear that reply.");
      }
    } else {
      const partySize = data.status === "no" ? (data.partySize || 0) : Math.max(1, data.partySize);
      const { error } = await supabaseAdmin.from("rsvps").upsert(
        {
          invitation_id: data.invitationId,
          status: data.status,
          party_size: partySize,
          attendance_mode: data.attendanceMode,
          responded_at: beforeRsvp?.responded_at ?? new Date().toISOString(),
        },
        { onConflict: "invitation_id" },
      );
      if (error) throw new Error("Could not save that RSVP.");
    }

    const [{ data: afterInv }, { data: afterRsvp }] = await Promise.all([
      supabaseAdmin
        .from("invitations")
        .select("id,guest_name,guest_phone")
        .eq("id", data.invitationId)
        .maybeSingle(),
      supabaseAdmin
        .from("rsvps")
        .select("status,party_size,attendance_mode,responded_at")
        .eq("invitation_id", data.invitationId)
        .maybeSingle(),
    ]);

    const label = await actorLabel(context.supabase, context.userId);
    try {
      await supabaseAdmin.from("audit_log").insert({
        user_id: context.userId,
        display_name: label,
        action: "GUEST RECORD EDITED",
        target_type: "invitations",
        target_id: data.invitationId,
        success: true,
        metadata: {
          on_behalf_of: afterInv?.guest_name ?? null,
          acted_as: scope.isAdmin ? "admin" : "committee",
          reason: data.reason ?? null,
          before: {
            name: beforeInv.guest_name,
            phone: beforeInv.guest_phone,
            status: beforeRsvp?.status ?? "pending",
            party_size: beforeRsvp?.party_size ?? null,
            attendance_mode: beforeRsvp?.attendance_mode ?? null,
          },
          after: {
            name: afterInv?.guest_name ?? null,
            phone: afterInv?.guest_phone ?? null,
            status: afterRsvp?.status ?? "pending",
            party_size: afterRsvp?.party_size ?? null,
            attendance_mode: afterRsvp?.attendance_mode ?? null,
          },
          meals_on_order: mealQty,
        } as never,
      });
    } catch (err) {
      console.error("[guest-edit] audit log failed", err);
    }

    return {
      ok: true as const,
      needsMealConfirm: false as const,
      guest: {
        invitation_id: data.invitationId,
        name: afterInv?.guest_name ?? "",
        phone: afterInv?.guest_phone ?? "",
        rsvp_status: afterRsvp?.status ?? "pending",
        party_size: afterRsvp?.party_size ?? "",
        attendance_mode: afterRsvp?.attendance_mode ?? "",
        responded_at: afterRsvp?.responded_at ?? "",
      },
      markedBy: label,
    };
  });
