// Server-only helpers for the restaurant payment portal.
import { createHash, timingSafeEqual } from "node:crypto";
import { normalizeCuisine, parseSelections } from "@/lib/preorder-math";
import { phoneMatches } from "@/lib/phone";
import { isPaidState } from "@/lib/meal-communication";

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

type RsvpLite = { status: string | null; attendance_mode?: string | null };

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

  const [{ data: preorders }, ledger] = await Promise.all([
    supabaseAdmin
      .from("cuisine_preorders")
      .select("id,name,phone,selections,invitation_id,invitations(rsvps(status,attendance_mode))")
      .order("name"),
    import("@/lib/meal-communication.server").then(({ loadMealCommunicationLedger }) =>
      loadMealCommunicationLedger(supabaseAdmin),
    ),
  ]);
  const ledgerByKey = new Map(ledger.rows.map((row) => [`${row.id}|${row.cuisine}`, row] as const));

  const rows: PortalOrderRow[] = [];
  for (const p of (preorders ?? []) as Array<{
    id: string;
    name: string | null;
    phone: string | null;
    selections: unknown;
    invitation_id: string | null;
    invitations:
      | { rsvps: RsvpLite | Array<RsvpLite> | null }
      | Array<{ rsvps: RsvpLite | Array<RsvpLite> | null }>
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
    // not send a declined/pending/Zoom-only guest's meal to a restaurant as an
    // active order. Same rule as the meal-communication ledger.
    if (
      !p.invitation_id ||
      !rsvps.some((r) => r.status === "yes" && r.attendance_mode !== "zoom")
    )
      continue;
    for (const sel of parseSelections(p.selections)) {
      if (sel.cuisine !== cuisine) continue;
      const status = ledgerByKey.get(`${p.id}|${sel.cuisine}`);
      if (!status) continue;
      const paid = isPaidState(status.state);
      rows.push({
        preorderId: p.id,
        guestName: (p.name ?? "").trim() || "Guest",
        phone: (p.phone ?? "").trim(),
        cuisine: sel.cuisine,
        qty: sel.qty,
        paid,
        paidAt: status.paid_at,
        paidSource: status.paid_source,
        paidNote: status.paid_note,
        qtyPaid: status.qty_paid,
        // Canonical payment confirmation: restaurant/verified payment OR the
        // restaurant checklist row, resolved once in the meal communication ledger.
        confirmed: status.state === "paid_confirmed",
        confirmedAt: status.verified_at,
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
    const verifiedAt = new Date().toISOString();
    const { error } = await supabaseAdmin.from("meal_payments").upsert(
      {
        preorder_id: opts.preorderId,
        restaurant_id: opts.restaurantId,
        cuisine: row.cuisine,
        qty_paid: qtyPaid,
        paid_at: verifiedAt,
        marked_by_label: opts.markedByLabel,
        source: "restaurant",
        verified_at: verifiedAt,
        updated_at: verifiedAt,
      },
      { onConflict: "preorder_id,cuisine" },
    );
    if (error) throw new Error(error.message);

    // A restaurant-verified payment IS a restaurant confirmation: write the
    // matching meal_order_status row so the two tables can never diverge.
    const { error: statusErr } = await supabaseAdmin.from("meal_order_status").upsert(
      {
        preorder_id: opts.preorderId,
        restaurant_id: opts.restaurantId,
        cuisine: row.cuisine,
        confirmed: true,
        confirmed_at: verifiedAt,
        confirmed_by_label: opts.markedByLabel,
        qty_confirmed: Math.max(Number(row.qty ?? 0), qtyPaid),
        updated_at: verifiedAt,
      },
      { onConflict: "preorder_id,cuisine" },
    );
    if (statusErr) throw new Error(statusErr.message);
  } else if (existingPayment) {
    // Payment records are permanent: a restaurant cannot erase one. Only the
    // guest cancelling the meal in their own RSVP removes it from the order.
    throw new Error(
      "This payment is on the permanent record and cannot be removed here. If it was recorded in error, contact the organizers.",
    );
  }

  return loadPortalData(opts.restaurantId);
}
