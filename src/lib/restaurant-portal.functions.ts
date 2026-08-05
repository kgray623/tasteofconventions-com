import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PortalData } from "@/lib/restaurant-portal-types";

type PortalSession = { restaurantId?: string; restaurantName?: string };

async function portalSession() {
  const { useSession } = await import("@tanstack/react-start/server");
  return useSession<PortalSession>(sessionConfig());
}

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "restaurant-portal",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export const restaurantPortalLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ restaurant: z.string().min(2).max(120), code: z.string().min(4).max(80) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; data?: PortalData }> => {
    const { findRestaurantByName, codeMatches, restaurantPhoneMatches, loadPortalData } =
      await import("@/lib/restaurant-portal.server");
    const restaurant = await findRestaurantByName(data.restaurant);
    if (!restaurant) return { ok: false };

    // Primary credential: the restaurant's own phone number.
    let ok = restaurantPhoneMatches(data.code, restaurant.phone);

    // Fallback: an admin-set access code (kept working for anything already issued).
    if (!ok) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: access } = await supabaseAdmin
        .from("restaurant_portal_access")
        .select("code_hash,active")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();
      if (access && access.active !== false) {
        ok = codeMatches(data.code, access.code_hash as string);
      }
    }
    if (!ok) return { ok: false };

    const session = await portalSession();
    await session.update({ restaurantId: restaurant.id, restaurantName: restaurant.name });
    return { ok: true, data: await loadPortalData(restaurant.id) };
  });


export const restaurantPortalLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await portalSession();
  await session.clear();
  return { ok: true };
});

export const getRestaurantPortalData = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ signedIn: boolean; data?: PortalData }> => {
    const session = await portalSession();
    const restaurantId = session.data.restaurantId;
    if (!restaurantId) return { signedIn: false };
    const { loadPortalData } = await import("@/lib/restaurant-portal.server");
    return { signedIn: true, data: await loadPortalData(restaurantId) };
  },
);

export const restaurantMarkPaid = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ preorderId: z.string().uuid(), paid: z.boolean() }).parse(d),
  )
  .handler(async ({ data }): Promise<{ signedIn: boolean; data?: PortalData }> => {
    const session = await portalSession();
    const restaurantId = session.data.restaurantId;
    if (!restaurantId) return { signedIn: false };
    const { setPaid } = await import("@/lib/restaurant-portal.server");
    const updated = await setPaid({
      restaurantId,
      preorderId: data.preorderId,
      paid: data.paid,
      markedByLabel: `restaurant:${session.data.restaurantName ?? restaurantId}`,
    });
    return { signedIn: true, data: updated };
  });

/* ---------- Admin: manage access codes + see payment status ---------- */

async function assertAdminOrTeam(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "team"]);
  if (!data || data.length === 0) throw new Error("Forbidden");
}

export const listRestaurantAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrTeam(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: restaurants }, { data: access }, { data: payments }] = await Promise.all([
      supabaseAdmin.from("restaurants").select("id,name,cuisine,phone,active").order("name"),
      supabaseAdmin.from("restaurant_portal_access").select("restaurant_id,active,rotated_at,label"),
      supabaseAdmin.from("meal_payments").select("restaurant_id,cuisine,qty_paid"),
    ]);
    const paidByRestaurant = new Map<string, number>();
    for (const p of (payments ?? []) as Array<{ restaurant_id: string | null; qty_paid: number }>) {
      if (!p.restaurant_id) continue;
      paidByRestaurant.set(p.restaurant_id, (paidByRestaurant.get(p.restaurant_id) ?? 0) + Number(p.qty_paid ?? 0));
    }
    const accessMap = new Map(
      ((access ?? []) as Array<{ restaurant_id: string; active: boolean; rotated_at: string; label: string | null }>).map(
        (a) => [a.restaurant_id, a],
      ),
    );
    return {
      restaurants: ((restaurants ?? []) as Array<{ id: string; name: string; cuisine: string | null; active: boolean }>)
        .filter((r) => r.active !== false)
        .map((r) => ({
          id: r.id,
          name: r.name,
          cuisine: r.cuisine,
          hasCode: accessMap.has(r.id),
          codeActive: accessMap.get(r.id)?.active ?? false,
          rotatedAt: accessMap.get(r.id)?.rotated_at ?? null,
          mealsPaid: paidByRestaurant.get(r.id) ?? 0,
        })),
    };
  });

export const setRestaurantAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ restaurantId: z.string().uuid(), code: z.string().min(4).max(60) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrTeam(context.supabase, context.userId);
    const { hashCode } = await import("@/lib/restaurant-portal.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("restaurant_portal_access").upsert(
      {
        restaurant_id: data.restaurantId,
        code_hash: hashCode(data.code),
        active: true,
        rotated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMealPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrTeam(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("meal_payments")
      .select("preorder_id,cuisine,qty_paid,paid_at");
    return {
      payments: ((data ?? []) as Array<{
        preorder_id: string;
        cuisine: string;
        qty_paid: number;
        paid_at: string | null;
      }>),
    };
  });
