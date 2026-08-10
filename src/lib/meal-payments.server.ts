// Server-only helpers for recording catered-meal payments that did not come
// from a restaurant portal action (guest self-reports and committee entries).
// Nothing here ever deletes or downgrades an existing restaurant confirmation.

import { normalizeCuisine, parseSelections } from "@/lib/preorder-math";

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
  const { data, error } = await supabaseAdmin
    .from("meal_payments")
    .select(
      "id,preorder_id,cuisine,qty_paid,paid_at,source,method,reported_note,reported_by_label,verified_at",
    )
    .in("source", ["guest_reported", "committee_recorded"])
    .is("verified_at", null)
    .order("paid_at", { ascending: false });
  if (error) throw new Error(error.message);

  const ids = [...new Set((data ?? []).map((r: any) => r.preorder_id))];
  const guests = new Map<string, { name: string; phone: string }>();
  if (ids.length) {
    const { data: preorders, error: pErr } = await supabaseAdmin
      .from("cuisine_preorders")
      .select("id,name,phone")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    for (const p of preorders ?? []) {
      guests.set(p.id, { name: (p.name ?? "").trim() || "Guest", phone: (p.phone ?? "").trim() });
    }
  }

  return {
    rows: (data ?? []).map((r: any) => ({
      id: r.id as string,
      preorder_id: r.preorder_id as string,
      guest: guests.get(r.preorder_id)?.name ?? "Guest",
      phone: guests.get(r.preorder_id)?.phone ?? "",
      cuisine: r.cuisine as string,
      qty: Number(r.qty_paid ?? 0),
      paid_at: (r.paid_at ?? null) as string | null,
      source: r.source as "guest_reported" | "committee_recorded",
      method: (r.method ?? null) as string | null,
      note: (r.reported_note ?? null) as string | null,
      reported_by_label: (r.reported_by_label ?? null) as string | null,
    })),
    generated_at: new Date().toISOString(),
  };
}

/**
 * Only admins and team (committee) members may record payments on behalf of
 * guests or read the reported-payment roster, which contains other guests'
 * names, phones, and private notes.
 */
export async function assertMealPaymentStaff(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "team"]);
  if (!data || data.length === 0) throw new Error("Forbidden");
}
