// Server-only helpers for recording catered-meal payments that did not come
// from a restaurant portal action (guest self-reports and committee entries).
// Nothing here ever deletes or downgrades an existing restaurant confirmation.

import { normalizeCuisine, parseSelections } from "@/lib/preorder-math";
import { loadMealCommunicationLedger } from "@/lib/meal-communication.server";

export type MealPaymentReportInput = {
  preorder_id: string;
  cuisine: string;
  qty: number;
  method: string | null;
  note: string | null;
  source: "guest_reported" | "committee_recorded";
  reported_by: string | null;
  reported_by_label: string | null;
  paid_at: string;
};

/**
 * Record one (preorder + cuisine) payment. Writes exactly one row — never
 * copies the mark across a guest's other meals — and refuses to weaken an
 * existing restaurant-confirmed payment. Reads the row back before returning.
 */
export async function recordMealPayment(supabaseAdmin: any, input: MealPaymentReportInput) {
  const cuisine = normalizeCuisine(input.cuisine);

  const { data: preorder, error: preorderErr } = await supabaseAdmin
    .from("cuisine_preorders")
    .select("id,name,selections")
    .eq("id", input.preorder_id)
    .maybeSingle();
  if (preorderErr) throw new Error(preorderErr.message);
  if (!preorder) throw new Error("That meal order could not be found.");

  const ordered = parseSelections(preorder.selections).find((s) => s.cuisine === cuisine);
  if (!ordered) throw new Error(`No ${cuisine} meal is on this order.`);
  const qty = Math.min(Math.max(1, Math.round(input.qty || 1)), ordered.qty);

  const { data: restaurant, error: restaurantErr } = await supabaseAdmin
    .from("restaurants")
    .select("id")
    .eq("cuisine", cuisine)
    .maybeSingle();
  if (restaurantErr) throw new Error(restaurantErr.message);
  if (!restaurant) throw new Error(`No restaurant is configured for ${cuisine}.`);

  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("meal_payments")
    .select("id,source,qty_paid,paid_at,verified_at")
    .eq("preorder_id", input.preorder_id)
    .eq("cuisine", cuisine)
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);

  if (existing?.source === "restaurant") {
    return { ok: true, alreadyConfirmed: true, cuisine, qty: Number(existing.qty_paid ?? qty) };
  }

  const payload = {
    preorder_id: input.preorder_id,
    restaurant_id: restaurant.id,
    cuisine,
    qty_paid: qty,
    paid_at: input.paid_at,
    source: input.source,
    method: input.method?.slice(0, 60) ?? null,
    reported_by: input.reported_by,
    reported_by_label: input.reported_by_label?.slice(0, 120) ?? null,
    reported_note: input.note?.slice(0, 500) ?? null,
    updated_at: new Date().toISOString(),
  };


  const { error } = existing
    ? await supabaseAdmin.from("meal_payments").update(payload).eq("id", existing.id)
    : await supabaseAdmin.from("meal_payments").insert(payload);
  if (error) throw new Error(error.message);

  // Read-back: never report success from the write alone.
  const { data: saved, error: readErr } = await supabaseAdmin
    .from("meal_payments")
    .select("id,cuisine,qty_paid,paid_at,source,method,reported_note,verified_at")
    .eq("preorder_id", input.preorder_id)
    .eq("cuisine", cuisine)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!saved) throw new Error("The payment did not save. Nothing was recorded.");

  return { ok: true, alreadyConfirmed: false, cuisine, qty, saved };
}

/** Payments reported by a guest or committee member that the restaurant has not confirmed yet. */
export async function listReportedMealPayments(supabaseAdmin: any) {
  const ledger = await loadMealCommunicationLedger(supabaseAdmin);
  const pending = ledger.rows.filter((row) => row.state === "paid_reported");

  return {
    rows: pending.map((row) => ({
      id: row.payment_id ?? `${row.id}::${row.cuisine}`,
      preorder_id: row.id,
      guest: row.name,
      phone: row.phone,
      cuisine: row.cuisine,
      qty: row.qty,
      paid_at: row.paid_at,
      source: row.paid_source as "guest_reported" | "committee_recorded",
      method: row.paid_method,
      note: row.paid_note,
      reported_by_label: row.paid_reported_by_label,
    })),
    generated_at: ledger.generated_at,
  };
}

/**
 * Only admins and team (committee) members may record payments on behalf of
 * guests or read the reported-payment roster, which contains other guests'
 * names, phones, and private notes.
 *
 * SECURITY: every server function that touches meal_payments through the
 * service-role client (which bypasses RLS) must call this first. The check runs
 * on the caller's own RLS-scoped client — never the admin client — and fails
 * closed on any error or missing role, so a signed-in guest can never read or
 * write another guest's payment records.
 */
export async function assertMealPaymentStaff(supabase: any, userId: string) {
  if (!supabase || !userId) throw new Error("Forbidden");
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "team"]);
  if (error) throw new Error("Forbidden");
  const roles = (data ?? []).map((r: any) => r?.role);
  if (!roles.includes("admin") && !roles.includes("team")) throw new Error("Forbidden");
  return { isAdmin: roles.includes("admin") };
}

/**
 * Admins may record a payment for anyone. A committee (team) member may only
 * record one for a guest on their own list — the same ownership rule the guest
 * roster uses. Fails closed.
 */
export async function assertCanRecordPaymentForPreorder(
  supabaseAdmin: any,
  userId: string,
  preorderId: string,
  isAdmin: boolean,
) {
  if (isAdmin) return;

  const { data: preorder, error } = await supabaseAdmin
    .from("cuisine_preorders")
    .select("invitation_id")
    .eq("id", preorderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!preorder?.invitation_id) {
    throw new Error("That meal order is not linked to a guest on your list.");
  }

  const { data: inv } = await supabaseAdmin
    .from("invitations")
    .select("inviter_id,host_id")
    .eq("id", preorder.invitation_id)
    .maybeSingle();
  if (!inv) throw new Error("That guest no longer exists.");

  const { data: mine } = await supabaseAdmin.from("inviters").select("id").eq("host_id", userId);
  const inviterIds = (mine ?? []).map((r: any) => r.id as string);
  const ownsByInviter = !!inv.inviter_id && inviterIds.includes(inv.inviter_id);
  if (!ownsByInviter && inv.host_id !== userId) {
    throw new Error("That guest is not on your list, so you cannot record their payment.");
  }
}

