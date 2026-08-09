import { buildMealCommunicationLedger } from "@/lib/meal-communication";

export async function loadMealCommunicationLedger(supabaseAdmin: any) {
  const [preorders, invitations, inviters, originalSends, updateSends, payments, confirmations] =
    await Promise.all([
      supabaseAdmin.from("cuisine_preorders").select("id,invitation_id,name,phone,selections").order("name"),
      supabaseAdmin.from("invitations").select("id,inviter_id"),
      supabaseAdmin.from("inviters").select("id,name"),
      supabaseAdmin.from("meal_text_sends").select("preorder_id,cuisine,sent_at"),
      supabaseAdmin.from("meal_zelle_text_sends").select("preorder_id,cuisine,sent_at"),
      supabaseAdmin.from("meal_payments").select("preorder_id,cuisine,paid_at"),
      supabaseAdmin.from("meal_order_status").select("preorder_id,cuisine,confirmed,confirmed_at"),
    ]);
  for (const result of [
    preorders,
    invitations,
    inviters,
    originalSends,
    updateSends,
    payments,
    confirmations,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }
  return buildMealCommunicationLedger({
    preorders: preorders.data ?? [],
    invitations: invitations.data ?? [],
    inviters: inviters.data ?? [],
    originalSends: originalSends.data ?? [],
    updateSends: updateSends.data ?? [],
    payments: payments.data ?? [],
    confirmations: confirmations.data ?? [],
  });
}
