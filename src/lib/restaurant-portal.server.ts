// Server-only helpers for the restaurant payment portal.
import { createHash, timingSafeEqual } from "node:crypto";
import { normalizeCuisine, parseSelections } from "@/lib/preorder-math";
import { phoneMatches } from "@/lib/phone";

import type { PortalData, PortalOrderRow } from "@/lib/restaurant-portal-types";

export type { PortalData, PortalOrderRow };

export function hashCode(code: string) {
  return createHash("sha256").update(code.trim().toLowerCase(), "utf8").digest("hex");
}

export function codeMatches(input: string, storedHash: string) {
  const a = Buffer.from(hashCode(input), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Password rule for this project: the password is the phone number.
 * A restaurant signs in with its own phone number on file (digits only,
 * last 10 digits), so formatting differences never block sign-in.
 */
export function restaurantPhoneMatches(input: string, restaurantPhone: string | null | undefined) {
  return phoneMatches(input, restaurantPhone);
}

export function normName(s: string | null | undefined) {
  return (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

/** Resolve a restaurant by fuzzy name match (portal login) */
export async function findRestaurantByName(name: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("restaurants")
    .select("id,name,cuisine,phone,active")
    .eq("active", true);
  const want = normName(name);
  if (!want) return null;
  const list = (data ?? []) as Array<{
    id: string;
    name: string;
    cuisine: string | null;
    phone: string | null;
  }>;
  return (
    list.find((r) => normName(r.name) === want) ??
    list.find((r) => normName(r.cuisine) === want) ??
    list.find((r) => normName(r.name).includes(want) || want.includes(normName(r.name))) ??
    list.find((r) => normName(r.cuisine).includes(want) || want.includes(normName(r.cuisine))) ??
    null
  );

}

export async function loadPortalData(restaurantId: string): Promise<PortalData> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: restaurant, error: rErr } = await supabaseAdmin
    .from("restaurants")
    .select("id,name,cuisine,phone")
    .eq("id", restaurantId)
    .maybeSingle();
  if (rErr) throw new Error(rErr.message);
  if (!restaurant) throw new Error("Restaurant not found");

  const cuisine = normalizeCuisine(String(restaurant.cuisine ?? restaurant.name ?? ""));

  const [{ data: preorders }, { data: payments }, { data: statuses }] = await Promise.all([
    supabaseAdmin
      .from("cuisine_preorders")
      .select("id,name,phone,selections,invitation_id,invitations(rsvps(status))")
      .order("name"),
    supabaseAdmin
      .from("meal_payments")
      .select("preorder_id,cuisine,qty_paid,paid_at,source,reported_note,verified_at"),
    supabaseAdmin.from("meal_order_status").select("preorder_id,cuisine,confirmed,confirmed_at"),
  ]);

  const confirmedMap = new Map<string, { confirmed: boolean; confirmedAt: string | null }>();
  for (const s of (statuses ?? []) as Array<{
    preorder_id: string;
    cuisine: string;
    confirmed: boolean;
    confirmed_at: string | null;
  }>) {
    confirmedMap.set(`${s.preorder_id}|${normalizeCuisine(s.cuisine)}`, {
      confirmed: !!s.confirmed,
      confirmedAt: s.confirmed_at ?? null,
    });
  }

  const paidMap = new Map<
    string,
    {
      qty: number;
      paidAt: string | null;
      source: "restaurant" | "guest_reported" | "committee_recorded" | null;
      note: string | null;
      verifiedAt: string | null;
    }
  >();
  for (const p of (payments ?? []) as Array<{
    preorder_id: string;
    cuisine: string;
    qty_paid: number;
    paid_at: string;
    source: string | null;
    reported_note: string | null;
    verified_at: string | null;
  }>) {
    paidMap.set(`${p.preorder_id}|${normalizeCuisine(p.cuisine)}`, {
      qty: Number(p.qty_paid ?? 0),
      paidAt: p.paid_at ?? null,
      source: (p.source ?? "restaurant") as "restaurant",
      note: p.reported_note ?? null,
      verifiedAt: p.verified_at ?? null,
    });
  }

  const rows: PortalOrderRow[] = [];
  for (const p of (preorders ?? []) as Array<{
    id: string;
    name: string | null;
    phone: string | null;
    selections: unknown;
    invitation_id: string | null;
    invitations:
      | { rsvps: { status: string | null } | Array<{ status: string | null }> | null }
      | Array<{ rsvps: { status: string | null } | Array<{ status: string | null }> | null }>
      | null;
  }>) {
    const invitation = Array.isArray(p.invitations) ? p.invitations[0] : p.invitations;
    const rsvps = invitation
      ? Array.isArray(invitation.rsvps)
        ? invitation.rsvps
        : invitation.rsvps
          ? [invitation.rsvps]
          : []
      : [];
    // Preserve the preorder in the database and admin integrity review, but do
    // not send a declined/pending guest's meal to a restaurant as an active order.
    if (!p.invitation_id || !rsvps.some((r) => r.status === "yes")) continue;
    for (const sel of parseSelections(p.selections)) {
      if (sel.cuisine !== cuisine) continue;
      const paidEntry = paidMap.get(`${p.id}|${sel.cuisine}`);
      const statusEntry = confirmedMap.get(`${p.id}|${sel.cuisine}`);
      rows.push({
        preorderId: p.id,
        guestName: (p.name ?? "").trim() || "Guest",
        phone: (p.phone ?? "").trim(),
        cuisine: sel.cuisine,
        qty: sel.qty,
        paid: !!paidEntry && paidEntry.qty >= sel.qty,
        paidAt: paidEntry?.paidAt ?? null,
        paidSource: paidEntry?.source ?? null,
        paidNote: paidEntry?.note ?? null,
        qtyPaid: paidEntry?.qty ?? 0,
        // Confirmation agrees with the money record: either the restaurant's own
        // checklist row or a verified payment makes this line confirmed.
        confirmed: (statusEntry?.confirmed ?? false) || !!paidEntry?.verifiedAt,
        confirmedAt: statusEntry?.confirmedAt ?? paidEntry?.verifiedAt ?? null,
      });
    }
  }

  rows.sort((a, b) => Number(a.paid) - Number(b.paid) || a.guestName.localeCompare(b.guestName));

  const meals = rows.reduce((n, r) => n + r.qty, 0);
  const mealsPaid = rows.reduce((n, r) => n + (r.paid ? r.qty : 0), 0);
  return {
    restaurant: {
      id: restaurant.id as string,
      name: restaurant.name as string,
      cuisine: (restaurant.cuisine ?? null) as string | null,
      phone: (restaurant.phone ?? null) as string | null,
    },
    rows,
    totals: {
      meals,
      mealsPaid,
      mealsUnpaid: meals - mealsPaid,
      mealsConfirmed: rows.reduce((n, r) => n + (r.confirmed ? r.qty : 0), 0),
      households: rows.length,
      householdsPaid: rows.filter((r) => r.paid).length,
    },
  };
}

/** Restaurant accepts (or un-accepts) an order line into their kitchen queue. */
export async function setConfirmed(opts: {
  restaurantId: string;
  preorderId: string;
  confirmed: boolean;
  markedByLabel: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const data = await loadPortalData(opts.restaurantId);
  const row = data.rows.find((r) => r.preorderId === opts.preorderId);
  if (!row) throw new Error("That order is not on your list");

  const { error } = await supabaseAdmin.from("meal_order_status").upsert(
    {
      preorder_id: opts.preorderId,
      restaurant_id: opts.restaurantId,
      cuisine: row.cuisine,
      confirmed: opts.confirmed,
      confirmed_at: opts.confirmed ? new Date().toISOString() : null,
      confirmed_by_label: opts.markedByLabel,
      qty_confirmed: opts.confirmed ? row.qty : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "preorder_id,cuisine" },
  );
  if (error) throw new Error(error.message);

  // Keep meal_payments (the source of truth for money) in step: when the
  // restaurant confirms a line that already has a recorded payment, that
  // payment becomes restaurant-verified. A confirmation never invents a
  // payment, and un-confirming never erases one.
  if (opts.confirmed) {
    const { data: payment } = await supabaseAdmin
      .from("meal_payments")
      .select("id,verified_at")
      .eq("preorder_id", opts.preorderId)
      .eq("cuisine", row.cuisine)
      .maybeSingle();
    if (payment && !payment.verified_at) {
      const { error: verifyErr } = await supabaseAdmin
        .from("meal_payments")
        .update({
          source: "restaurant",
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      if (verifyErr) throw new Error(verifyErr.message);
    }
  }
  return loadPortalData(opts.restaurantId);
}


/**
 * Restaurant adjusts the meal count for their own cuisine only.
 * Every other cuisine in the household's pre-order is preserved untouched,
 * and the change is captured by the audit trigger on cuisine_preorders.
 */
export async function setQty(opts: {
  restaurantId: string;
  preorderId: string;
  qty: number;
  markedByLabel: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const data = await loadPortalData(opts.restaurantId);
  const row = data.rows.find((r) => r.preorderId === opts.preorderId);
  if (!row) throw new Error("That order is not on your list");

  const qty = Math.max(0, Math.min(50, Math.round(opts.qty)));

  const { data: existing, error: readErr } = await supabaseAdmin
    .from("cuisine_preorders")
    .select("selections")
    .eq("id", opts.preorderId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error("Pre-order not found");

  const raw = Array.isArray(existing.selections) ? (existing.selections as unknown[]) : [];
  const next: Record<string, unknown>[] = [];
  let replaced = false;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const itemCuisine = normalizeCuisine(String(obj["cuisine"] ?? obj["country"] ?? ""));
    if (itemCuisine !== row.cuisine) {
      next.push(obj);
      continue;
    }
    replaced = true;
    if (qty > 0) next.push({ ...obj, qty });
  }
  if (!replaced && qty > 0) next.push({ cuisine: row.cuisine, qty });

  const { error: updErr } = await supabaseAdmin
    .from("cuisine_preorders")
    .update({ selections: next as never, updated_at: new Date().toISOString() })
    .eq("id", opts.preorderId);
  if (updErr) throw new Error(updErr.message);

  // Payment records are permanent. A count change never deletes or lowers a
  // recorded payment — it is flagged instead, so the money history survives.
  if (qty === 0) {
    await supabaseAdmin
      .from("meal_payments")
      .update({
        cancelled_meal_at: new Date().toISOString(),
        cancelled_note: `Meal removed from the order in the ${row.cuisine} restaurant portal`,
        updated_at: new Date().toISOString(),
      })
      .eq("preorder_id", opts.preorderId)
      .eq("cuisine", row.cuisine);
    await supabaseAdmin
      .from("meal_order_status")
      .delete()
      .eq("preorder_id", opts.preorderId)
      .eq("cuisine", row.cuisine);
  } else {
    if (row.paid) {
      const { data: payment } = await supabaseAdmin
        .from("meal_payments")
        .select("id,qty_paid")
        .eq("preorder_id", opts.preorderId)
        .eq("cuisine", row.cuisine)
        .maybeSingle();
      // Only ever raise a paid count; lowering one is refused by the database.
      if (payment && qty > Number(payment.qty_paid ?? 0)) {
        await supabaseAdmin
          .from("meal_payments")
          .update({ qty_paid: qty, updated_at: new Date().toISOString() })
          .eq("id", payment.id);
      }
    }
    if (row.confirmed) {
      await supabaseAdmin
        .from("meal_order_status")
        .update({ qty_confirmed: qty, updated_at: new Date().toISOString() })
        .eq("preorder_id", opts.preorderId)
        .eq("cuisine", row.cuisine);
    }
  }


  return loadPortalData(opts.restaurantId);
}

export async function setPaid(opts: {
  restaurantId: string;
  preorderId: string;
  paid: boolean;
  markedByLabel: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const data = await loadPortalData(opts.restaurantId);
  const row = data.rows.find((r) => r.preorderId === opts.preorderId);
  if (!row) throw new Error("That order is not on your list");

  const { data: existingPayment } = await supabaseAdmin
    .from("meal_payments")
    .select("id,qty_paid,source")
    .eq("preorder_id", opts.preorderId)
    .eq("cuisine", row.cuisine)
    .maybeSingle();

  if (opts.paid) {
    // Never lower a quantity already on record — the database refuses it.
    const qtyPaid = Math.max(Number(row.qty ?? 0), Number(existingPayment?.qty_paid ?? 0));
    const { error } = await supabaseAdmin.from("meal_payments").upsert(
      {
        preorder_id: opts.preorderId,
        restaurant_id: opts.restaurantId,
        cuisine: row.cuisine,
        qty_paid: qtyPaid,
        paid_at: new Date().toISOString(),
        marked_by_label: opts.markedByLabel,
        source: "restaurant",
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "preorder_id,cuisine" },
    );
    if (error) throw new Error(error.message);
  } else if (existingPayment) {
    // Payment records are permanent: a restaurant cannot erase one. Only the
    // guest cancelling the meal in their own RSVP removes it from the order.
    throw new Error(
      "This payment is on the permanent record and cannot be removed here. If it was recorded in error, contact the organizers.",
    );
  }

  return loadPortalData(opts.restaurantId);
}
