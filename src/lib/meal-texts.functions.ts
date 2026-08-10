import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "team"]);
  if (!data || data.length === 0) throw new Error("Forbidden");
}

export {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  DEFAULT_ZELLE_UPDATE_TEMPLATE,
  type MealRestaurant,
  type MealTextRow,
} from "@/lib/meal-text-defaults";
import {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  DEFAULT_ZELLE_UPDATE_TEMPLATE,
  type MealRestaurant,
  type MealTextRow,
} from "@/lib/meal-text-defaults";

const RESTAURANT_COLUMNS =
  "id,name,cuisine,phone,website,order_ready,active,venmo_handle,zelle_name,zelle_phone,zelle_qr_url,chicken_price,beef_price,price_note";


export const getMealTextData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadMealCommunicationLedger } = await import("@/lib/meal-communication.server");

    const [
      { data: restaurants },
      { data: preorders },
      { data: setting },
      { data: invitationRows },
      { data: inviterRows },
      { data: sends },
      { data: zelleSends },
      { data: zelleSetting },
      ledger,
    ] = await Promise.all([
      supabaseAdmin.from("restaurants").select(RESTAURANT_COLUMNS).order("name"),
      supabaseAdmin
        .from("cuisine_preorders")
        .select("id,name,phone,selections,invitation_id")
        .order("name"),
      supabaseAdmin.from("app_settings").select("value").eq("key", "meal_text_template").maybeSingle(),
      supabaseAdmin.from("invitations").select("id,inviter_id"),
      supabaseAdmin.from("inviters").select("id,name"),
      supabaseAdmin.from("meal_text_sends").select("preorder_id,cuisine,sent_at"),
      supabaseAdmin.from("meal_zelle_text_sends").select("preorder_id,cuisine,sent_at,marked_by"),
      supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "meal_zelle_text_template")
        .maybeSingle(),
      loadMealCommunicationLedger(supabaseAdmin),
    ]);

    // Every payment-update mark is attributable to the person who tapped it.
    const markerIds = [
      ...new Set(((zelleSends ?? []) as any[]).map((s) => s.marked_by).filter(Boolean)),
    ] as string[];
    const markerNames = new Map<string, string>();
    if (markerIds.length > 0) {
      const { data: profileRows } = await supabaseAdmin
        .from("profiles")
        .select("id,display_name")
        .in("id", markerIds);
      for (const p of ((profileRows ?? []) as any[])) {
        markerNames.set(p.id as string, (p.display_name as string) ?? "");
      }
    }

    const zelleByMeal = new Map<string, string>();
    const zelleByWhom = new Map<string, string | null>();
    for (const s of ((zelleSends ?? []) as any[])) {
      const key = `${s.preorder_id}::${String(s.cuisine ?? "")}`;
      zelleByMeal.set(key, s.sent_at);
      zelleByWhom.set(key, (s.marked_by ? markerNames.get(s.marked_by) : null) || null);
    }

    const sentByMeal = new Map<string, string>();
    for (const s of ((sends ?? []) as any[])) {
      sentByMeal.set(`${s.preorder_id}::${String(s.cuisine ?? "")}`, s.sent_at);
    }

    const inviterNameById = new Map<string, string>(
      ((inviterRows ?? []) as any[]).map((r) => [r.id as string, (r.name as string) ?? "Committee"]),
    );
    const inviterIdByInvitation = new Map<string, string | null>(
      ((invitationRows ?? []) as any[]).map((r) => [r.id as string, (r.inviter_id as string) ?? null]),
    );


    const ledgerByKey = new Map(
      ledger.rows.map((row) => [`${row.id}::${row.cuisine}`, row] as const),
    );
    const rows: MealTextRow[] = [];
    for (const p of (preorders ?? []) as any[]) {
      const sel = Array.isArray(p.selections) ? p.selections : [];
      const byCuisine = new Map<string, number>();
      for (const item of sel) {
        if (!item || typeof item !== "object") continue;
        const raw = String(item.cuisine ?? item.country ?? "").trim();
        const qty = Number(item.qty);
        if (!raw || !Number.isFinite(qty) || qty <= 0) continue;
        const lower = raw.toLowerCase();
        const cuisine = lower.includes("burmese") || lower.includes("myanmar")
          ? "Myanmar"
          : lower.includes("africa")
            ? "African"
            : lower.includes("indonesia")
              ? "Indonesian"
              : raw;
        byCuisine.set(cuisine, (byCuisine.get(cuisine) ?? 0) + Math.round(qty));
      }
      const inviterId = p.invitation_id ? (inviterIdByInvitation.get(p.invitation_id) ?? null) : null;
      const inviterName = inviterId
        ? (inviterNameById.get(inviterId) ?? "Committee")
        : "Not linked to a committee member";
      for (const [cuisine, qty] of byCuisine) {
        rows.push({
          inviter: inviterName,
          id: p.id,
          name: (p.name ?? "").trim() || "Guest",
          phone: (p.phone ?? "").trim(),
          cuisine,
          qty,
          sent_at: sentByMeal.get(`${p.id}::${cuisine}`) ?? null,
          zelle_sent_at: zelleByMeal.get(`${p.id}::${cuisine}`) ?? null,
          sent_by: zelleByWhom.get(`${p.id}::${cuisine}`) ?? null,
          state: ledgerByKey.get(`${p.id}::${cuisine}`)?.state,
          paid_at: ledgerByKey.get(`${p.id}::${cuisine}`)?.paid_at ?? null,
          paid_source: ledgerByKey.get(`${p.id}::${cuisine}`)?.paid_source ?? null,
          paid_note: ledgerByKey.get(`${p.id}::${cuisine}`)?.paid_note ?? null,
          exception: ledgerByKey.get(`${p.id}::${cuisine}`)?.exception ?? null,
        });
      }
    }

    return {
      restaurants: ((restaurants ?? []) as any[])
        .filter((r) => r.active !== false)
        .map((r) => ({
          id: r.id as string,
          name: r.name as string,
          cuisine: (r.cuisine ?? null) as string | null,
          phone: (r.phone ?? null) as string | null,
          website: (r.website ?? null) as string | null,
          venmo_handle: (r.venmo_handle ?? null) as string | null,
          zelle_name: (r.zelle_name ?? null) as string | null,
          zelle_phone: (r.zelle_phone ?? null) as string | null,
          zelle_qr_url: (r.zelle_qr_url ?? null) as string | null,
          chicken_price: r.chicken_price === null || r.chicken_price === undefined ? null : Number(r.chicken_price),
          beef_price: r.beef_price === null || r.beef_price === undefined ? null : Number(r.beef_price),
          price_note: (r.price_note ?? null) as string | null,
          order_ready: r.order_ready !== false,
        })) as MealRestaurant[],
      rows,
      template: (setting?.value as string | undefined) ?? DEFAULT_MEAL_TEXT_TEMPLATE,
      zelleTemplate: (zelleSetting?.value as string | undefined) ?? DEFAULT_ZELLE_UPDATE_TEMPLATE,
      reconciliation: { totals: ledger.totals, generated_at: ledger.generated_at },
    };
  });

export const saveRestaurantContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        phone: z.string().max(40).nullable(),
        website: z.string().max(300).nullable().optional(),
        orderReady: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { phone: string | null; order_ready: boolean; website?: string | null } = {
      phone: data.phone?.trim() || null,
      order_ready: data.orderReady,
    };
    if (data.website !== undefined) patch.website = data.website?.trim() || null;

    const { error } = await supabaseAdmin
      .from("restaurants")
      .update(patch)
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveMealTextTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        template: z.string().min(1).max(4000),
        kind: z.enum(["meal", "zelle"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        {
          key: data.kind === "zelle" ? "meal_zelle_text_template" : "meal_text_template",
          value: data.template,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markMealTextSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        marks: z
          .array(z.object({ preorderId: z.string().uuid(), cuisine: z.string().min(1).max(80) }))
          .min(1)
          .max(500)
          // Each restaurant meal must be checked on its own: one action may never
          // mark two cuisines for the same guest, so a mark can't leak across meals.
          .refine(
            (marks) => new Set(marks.map((m) => m.preorderId)).size === marks.length,
            "Each guest's meals must be marked one at a time",
          ),
        sent: z.boolean(),
      })
      .parse(d),
  )

  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sentAt = new Date().toISOString();

    if (data.sent) {
      const { error } = await supabaseAdmin.from("meal_text_sends").upsert(
        data.marks.map((m) => ({
          preorder_id: m.preorderId,
          cuisine: m.cuisine,
          sent_at: sentAt,
          marked_by: context.userId,
        })),
        { onConflict: "preorder_id,cuisine" },
      );
      if (error) throw new Error(error.message);
      return { ok: true, sentAt };
    }

    for (const m of data.marks) {
      const { error } = await supabaseAdmin
        .from("meal_text_sends")
        .delete()
        .eq("preorder_id", m.preorderId)
        .eq("cuisine", m.cuisine);
      if (error) throw new Error(error.message);
    }
    return { ok: true, sentAt: null };
  });


/**
 * The Zelle/Venmo follow-up mark. Deliberately a separate table from
 * meal_text_sends so checking one can never change the other.
 */
export const markZelleTextSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        marks: z
          .array(z.object({ preorderId: z.string().uuid(), cuisine: z.string().min(1).max(80) }))
          .min(1)
          .max(500)
          .refine(
            (marks) => new Set(marks.map((m) => m.preorderId)).size === marks.length,
            "Each guest's meals must be marked one at a time",
          ),
        sent: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sentAt = new Date().toISOString();

    if (data.sent) {
      const { error } = await supabaseAdmin.from("meal_zelle_text_sends").upsert(
        data.marks.map((m) => ({
          preorder_id: m.preorderId,
          cuisine: m.cuisine,
          sent_at: sentAt,
          marked_by: context.userId,
        })),
        { onConflict: "preorder_id,cuisine" },
      );
      if (error) throw new Error(error.message);
      return { ok: true, sentAt };
    }

    for (const m of data.marks) {
      const { error } = await supabaseAdmin
        .from("meal_zelle_text_sends")
        .delete()
        .eq("preorder_id", m.preorderId)
        .eq("cuisine", m.cuisine);
      if (error) throw new Error(error.message);
    }
    return { ok: true, sentAt: null };
  });
