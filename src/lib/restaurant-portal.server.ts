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
export function restaurantPhoneMatches(
  input: string,
  restaurantPhone: string | null | undefined,
) {
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
  const list = (data ?? []) as Array<{ id: string; name: string; cuisine: string | null; phone: string | null }>;
  return (
    list.find((r) => normName(r.name) === want) ??
    list.find((r) => normName(r.name).includes(want) || want.includes(normName(r.name))) ??
    list.find((r) => normName(r.cuisine) === want) ??
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

  const [{ data: preorders }, { data: payments }] = await Promise.all([
    supabaseAdmin
      .from("cuisine_preorders")
      .select("id,name,phone,selections,invitation_id,invitations(rsvps(status))")
      .order("name"),
    supabaseAdmin.from("meal_payments").select("preorder_id,cuisine,qty_paid,paid_at"),
  ]);

  const paidMap = new Map<string, { qty: number; paidAt: string | null }>();
  for (const p of (payments ?? []) as Array<{ preorder_id: string; cuisine: string; qty_paid: number; paid_at: string }>) {
    paidMap.set(`${p.preorder_id}|${normalizeCuisine(p.cuisine)}`, {
      qty: Number(p.qty_paid ?? 0),
      paidAt: p.paid_at ?? null,
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
      rows.push({
        preorderId: p.id,
        guestName: (p.name ?? "").trim() || "Guest",
        phone: (p.phone ?? "").trim(),
        cuisine: sel.cuisine,
        qty: sel.qty,
        paid: !!paidEntry && paidEntry.qty >= sel.qty,
        paidAt: paidEntry?.paidAt ?? null,
        qtyPaid: paidEntry?.qty ?? 0,
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
      households: rows.length,
      householdsPaid: rows.filter((r) => r.paid).length,
    },
  };
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

  if (opts.paid) {
    const { error } = await supabaseAdmin.from("meal_payments").upsert(
      {
        preorder_id: opts.preorderId,
        restaurant_id: opts.restaurantId,
        cuisine: row.cuisine,
        qty_paid: row.qty,
        paid_at: new Date().toISOString(),
        marked_by_label: opts.markedByLabel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "preorder_id,cuisine" },
    );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin
      .from("meal_payments")
      .delete()
      .eq("preorder_id", opts.preorderId)
      .eq("cuisine", row.cuisine);
    if (error) throw new Error(error.message);
  }
  return loadPortalData(opts.restaurantId);
}
