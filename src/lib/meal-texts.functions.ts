import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  DEFAULT_ZELLE_UPDATE_TEMPLATE,
  type MealRestaurant,
  type MealTextEvidenceLine,
  type MealEventContact,
  type MealInstructionQueueContact,
  type MealTextRow,
} from "@/lib/meal-text-defaults";
import {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  DEFAULT_ZELLE_UPDATE_TEMPLATE,
  type MealRestaurant,
  type MealTextEvidenceLine,
  type MealEventContact,
  type MealInstructionQueueContact,
  type MealTextRow,
} from "@/lib/meal-text-defaults";

export const getMealTextData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadMealNotifyRollup } = await import("@/lib/meal-notify.server");

    const [
      { data: restaurants },
      { data: preorders },
      { data: setting },
      { data: invitationRows },
      { data: inviterRows },
      { data: sends },
      { data: zelleSends },
      { data: textEvents },
      { data: zelleSetting },
      ledger,
      todayEvidence,
    ] = await Promise.all([
      supabaseAdmin.from("restaurants").select("id,name,cuisine,phone,website,order_ready,active,venmo_handle,zelle_name,zelle_phone,zelle_qr_url,zelle_pay_link,chicken_price,beef_price,price_note").order("name"),
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
        .from("meal_text_events")
        .select("preorder_id,cuisine,campaign,action,event_at,actor_id,created_at")
        .order("event_at")
        .order("created_at"),
      supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "meal_zelle_text_template")
        .maybeSingle(),
      loadMealNotifyRollup(supabaseAdmin),
      (await import("@/lib/meal-text-evidence.server")).loadTodayPaymentTextEvidence(supabaseAdmin, context.userId),
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
    for (const event of ((textEvents ?? []) as any[])) {
      const key = `${event.preorder_id}::${String(event.cuisine ?? "")}`;
      const target = event.campaign === "original" ? sentByMeal : zelleByMeal;
      if (event.action === "sent") target.set(key, event.event_at);
      else target.delete(key);
      if (event.campaign === "payment_update") {
        if (event.action === "sent") {
          zelleByWhom.set(key, event.actor_id ? markerNames.get(event.actor_id) || null : null);
        } else {
          zelleByWhom.delete(key);
        }
      }
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
        const ledgerRow = ledgerByKey.get(`${p.id}::${cuisine}`);
        if (!ledgerRow) continue;
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
          state: ledgerRow.state,
          paid_at: ledgerRow.paid_at ?? null,
          paid_source: ledgerRow.paid_source ?? null,
          paid_note: ledgerRow.paid_note ?? null,
          exception: ledgerRow.exception ?? null,
        });
      }
    }

    // Admin-only test recipients are returned explicitly from the retained
    // preorder. The UI must not rediscover Kari through a paid/pending subset:
    // that previously made the test controls appear present in source while
    // remaining absent from the screen Kari actually uses.
    const kariTestRows = rows.filter((row) => {
      const digits = row.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
      return digits === "8082787562";
    });

    const { buildMealInstructionQueue } = await import("@/lib/meal-instruction-queue");

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
          zelle_pay_link: (r.zelle_pay_link ?? null) as string | null,
          chicken_price: r.chicken_price === null || r.chicken_price === undefined ? null : Number(r.chicken_price),
          beef_price: r.beef_price === null || r.beef_price === undefined ? null : Number(r.beef_price),
          price_note: (r.price_note ?? null) as string | null,
          order_ready: r.order_ready !== false,
        })) as MealRestaurant[],
      rows,
      instructionQueue: buildMealInstructionQueue(rows, todayEvidence.lines) as MealInstructionQueueContact[],
      kariTestRows,
      template: (setting?.value as string | undefined) ?? DEFAULT_MEAL_TEXT_TEMPLATE,
      zelleTemplate: (zelleSetting?.value as string | undefined) ?? DEFAULT_ZELLE_UPDATE_TEMPLATE,
      reconciliation: {
        totals: ledger.totals,
        generated_at: ledger.generated_at,
        text_accounting: ledger.text_accounting,
        committee_orders: ledger.committee_orders,
        committee_totals: ledger.committee_totals,
      },
      todayEvidence: todayEvidence as { utc_day: string; lines: MealTextEvidenceLine[] },
      // Who is signed in, so the test panel can text the message to themselves.
      // Read-only: nothing about the tester is written anywhere.
      self: await (async () => {
        let phone = "";
        let name = "";
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
          phone = (authUser?.user?.phone as string | undefined) ?? "";
        } catch {
          /* phone stays blank; the panel lets you type one */
        }
        try {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("display_name")
            .eq("id", context.userId)
            .maybeSingle();
          name = ((profile?.display_name as string | undefined) ?? "").trim();
        } catch {
          /* name stays blank */
        }
        if (!phone) {
          const { data: inv } = await supabaseAdmin
            .from("invitations")
            .select("guest_name,guest_phone")
            .eq("host_id", context.userId)
            .not("guest_phone", "is", null)
            .limit(1);
          const first = ((inv ?? []) as any[])[0];
          if (first) {
            phone = (first.guest_phone as string | undefined) ?? "";
            if (!name) name = ((first.guest_name as string | undefined) ?? "").trim();
          }
        }
        return { name, phone };
      })(),
    };
  });

export const reviewPaymentTextEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      eventIds: z.array(z.string().uuid()).min(1).max(20),
      decision: z.enum(["confirmed", "disputed"]),
      note: z.string().trim().max(500).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { appendPaymentTextEvidenceReviews } = await import("@/lib/meal-text-evidence.server");
    return appendPaymentTextEvidenceReviews(supabaseAdmin, {
      eventIds: data.eventIds,
      reviewerId: context.userId,
      decision: data.decision,
      note: data.note?.trim() || null,
    });
  });

export const reconcilePaymentTextContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      preorderId: z.string().uuid(),
      cuisines: z.array(z.string().min(1).max(80)).min(1).max(10),
      decision: z.enum(["confirmed", "disputed"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const evidence = await import("@/lib/meal-text-evidence.server");
    return evidence.reconcilePaymentTextContact(supabaseAdmin, {
      preorderId: data.preorderId,
      cuisines: data.cuisines,
      reviewerId: context.userId,
      decision: data.decision,
    });
  });

export const confirmMealInstructionText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      preorderId: z.string().uuid(),
      cuisine: z.string().min(1).max(80),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { confirmMealInstructionText } = await import("@/lib/meal-text-evidence.server");
    return confirmMealInstructionText(supabaseAdmin, {
      preorderId: data.preorderId,
      cuisine: data.cuisine,
      reviewerId: context.userId,
    });
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
    const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
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
    const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
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
    const { appendMealTextEvents, assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return appendMealTextEvents(supabaseAdmin, {
      campaign: "original",
      marks: data.marks,
      sent: data.sent,
      actorId: context.userId,
    });
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
    const { appendMealTextEvents, assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return appendMealTextEvents(supabaseAdmin, {
      campaign: "payment_update",
      marks: data.marks,
      sent: data.sent,
      actorId: context.userId,
    });
  });
