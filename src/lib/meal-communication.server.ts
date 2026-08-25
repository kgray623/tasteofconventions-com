import { buildMealCommunicationLedger } from "@/lib/meal-communication";

export async function loadMealCommunicationLedger(
  supabaseAdmin: any,
  options: { includeInactive?: boolean } = {},
) {
  const [preorders, invitations, rsvps, inviters, originalSends, updateSends, textEvents, payments, confirmations] =
    await Promise.all([
      supabaseAdmin.from("cuisine_preorders").select("id,invitation_id,name,phone,selections").order("name"),
      supabaseAdmin.from("invitations").select("id,inviter_id"),
      supabaseAdmin.from("rsvps").select("invitation_id,status,attendance_mode"),
      supabaseAdmin.from("inviters").select("id,name"),
      supabaseAdmin.from("meal_text_sends").select("preorder_id,cuisine,sent_at"),
      supabaseAdmin.from("meal_zelle_text_sends").select("preorder_id,cuisine,sent_at"),
      supabaseAdmin
        .from("meal_text_events")
        .select("preorder_id,cuisine,campaign,action,event_at,created_at")
        .order("event_at"),
      supabaseAdmin
        .from("meal_payments")
        .select("id,preorder_id,cuisine,qty_paid,paid_at,source,method,reported_note,reported_by_label,verified_at,cancelled_meal_at"),
      supabaseAdmin.from("meal_order_status").select("preorder_id,cuisine,confirmed,confirmed_at"),
    ]);
  for (const result of [
    preorders,
    invitations,
    rsvps,
    inviters,
    originalSends,
    updateSends,
    textEvents,
    payments,
    confirmations,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }
  const rsvpByInvitation = new Map(
    ((rsvps.data ?? []) as any[]).map((row) => [row.invitation_id as string, row]),
  );
  const activePreorders = ((preorders.data ?? []) as any[]).filter((preorder) => {
    if (options.includeInactive) return true;
    if (!preorder.invitation_id) return true;
    const rsvp = rsvpByInvitation.get(preorder.invitation_id);
    if (!rsvp) return true;
    return rsvp.status !== "no" && rsvp.attendance_mode !== "zoom";
  });
  return buildMealCommunicationLedger({
    preorders: activePreorders,
    invitations: invitations.data ?? [],
    inviters: inviters.data ?? [],
    originalSends: originalSends.data ?? [],
    updateSends: updateSends.data ?? [],
    textEvents: textEvents.data ?? [],
    payments: ((payments.data ?? []) as any[]).filter((row) => !row.cancelled_meal_at),
    confirmations: confirmations.data ?? [],
  });
}
