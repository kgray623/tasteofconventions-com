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
  type MealRestaurant,
  type MealTextRow,
} from "@/lib/meal-text-defaults";
import { DEFAULT_MEAL_TEXT_TEMPLATE, type MealRestaurant, type MealTextRow } from "@/lib/meal-text-defaults";


export const getMealTextData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: restaurants }, { data: preorders }, { data: setting }, { data: invitationRows }, { data: inviterRows }] = await Promise.all([
      supabaseAdmin.from("restaurants").select("id,name,cuisine,phone,website,order_ready,active").order("name"),
      supabaseAdmin
        .from("cuisine_preorders")
        .select("id,name,phone,selections,meal_text_sent_at,invitation_id")
        .order("name"),
      supabaseAdmin.from("app_settings").select("value").eq("key", "meal_text_template").maybeSingle(),
      supabaseAdmin.from("invitations").select("id,inviter_id"),
      supabaseAdmin.from("inviters").select("id,name"),
    ]);

    const inviterNameById = new Map<string, string>(
      ((inviterRows ?? []) as any[]).map((r) => [r.id as string, (r.name as string) ?? "Committee"]),
    );
    const inviterIdByInvitation = new Map<string, string | null>(
      ((invitationRows ?? []) as any[]).map((r) => [r.id as string, (r.inviter_id as string) ?? null]),
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
          sent_at: p.meal_text_sent_at ?? null,
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

          order_ready: r.order_ready !== false,
        })) as MealRestaurant[],
      rows,
      template: (setting?.value as string | undefined) ?? DEFAULT_MEAL_TEXT_TEMPLATE,
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
  .inputValidator((d: unknown) => z.object({ template: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        { key: "meal_text_template", value: data.template, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markMealTextSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500), sent: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("cuisine_preorders")
      .update({ meal_text_sent_at: data.sent ? new Date().toISOString() : null })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, sentAt: data.sent ? new Date().toISOString() : null };
  });
