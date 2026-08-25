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
  type MealTextBatchReconciliation,
  type MealTextRow,
  type MealTextExcludedRow,
} from "@/lib/meal-text-defaults";
import {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  DEFAULT_ZELLE_UPDATE_TEMPLATE,
  type MealRestaurant,
  type MealTextEvidenceLine,
  type MealEventContact,
  type MealInstructionQueueContact,
  type MealTextBatchReconciliation,
  type MealTextRow,
  type MealTextExcludedRow,
} from "@/lib/meal-text-defaults";

export const getMealTextData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    const staff = await assertMealStaff(context.supabase, context.userId);
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
      allLedger,
      todayEvidence,
      instructionEvidence,
    ] = await Promise.all([
      supabaseAdmin.from("restaurants").select("id,name,cuisine,phone,website,order_ready,active,venmo_handle,zelle_name,zelle_phone,zelle_qr_url,zelle_pay_link,chicken_price,beef_price,price_note").order("name"),
      supabaseAdmin
        .from("cuisine_preorders")
        .select("id,name,phone,selections,invitation_id")
        .order("name"),
      supabaseAdmin.from("app_settings").select("value").eq("key", "meal_text_template").maybeSingle(),
      supabaseAdmin.from("invitations").select("id,inviter_id,rsvps(status,attendance_mode)"),
      supabaseAdmin.from("inviters").select("id,name"),
      supabaseAdmin.from("meal_text_sends").select("preorder_id,cuisine,sent_at"),
      supabaseAdmin.from("meal_zelle_text_sends").select("preorder_id,cuisine,sent_at,marked_by"),
      supabaseAdmin
        .from("meal_text_events")
        .select("preorder_id,cuisine,campaign,action,event_at,actor_id,created_at,evidence_source")
        .order("event_at")
        .order("created_at"),
      supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "meal_zelle_text_template")
        .maybeSingle(),
      loadMealNotifyRollup(supabaseAdmin),
      import("@/lib/meal-communication.server").then(({ loadMealCommunicationLedger }) =>
        loadMealCommunicationLedger(supabaseAdmin, { includeInactive: true }),
      ),
      (await import("@/lib/meal-text-evidence.server")).loadTodayPaymentTextEvidence(supabaseAdmin, context.userId),
      (await import("@/lib/meal-text-evidence.server")).loadConfirmedInstructionEvidence(supabaseAdmin),
    ]);

    // ONE source of truth for sent marks: meal_text_events is canonical, the
    // legacy send tables are read-only fallback, and every cuisine string is
    // normalized inside the resolver so no mark can miss its row.
    const { resolveMealSentMarks, findOrphanSentMarks, isPaidState } = await import("@/lib/meal-communication");
    const marks = resolveMealSentMarks({
      originalSends: (sends ?? []) as any[],
      updateSends: (zelleSends ?? []) as any[],
      textEvents: (textEvents ?? []) as any[],
    });
    const sentByMeal = marks.original;
    const zelleByMeal = marks.update;
    // Real text marks for cuisines no longer on the order: kept, never dropped,
    // and reported so the team can see the whole texting history.
    const orphanMarks = findOrphanSentMarks({ preorders: (preorders ?? []) as any[], marks });


    // Every payment-update mark is attributable to the person who tapped it.
    const markerIds = [...new Set([...marks.updateActorId.values()].filter(Boolean))] as string[];
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
    const zelleByWhom = new Map<string, string | null>();
    for (const [key, actorId] of marks.updateActorId) {
      zelleByWhom.set(key, (actorId ? markerNames.get(actorId) : null) || null);
    }


    const inviterNameById = new Map<string, string>(
      ((inviterRows ?? []) as any[]).map((r) => [r.id as string, (r.name as string) ?? "Committee"]),
    );
    const inviterIdByInvitation = new Map<string, string | null>(
      ((invitationRows ?? []) as any[]).map((r) => [r.id as string, (r.inviter_id as string) ?? null]),
    );
    // RSVP status per invitation, so orders excluded from the chase groups can
    // still be listed with the exact reason they are excluded.
    const rsvpStatusByInvitation = new Map<string, string>();
    const rsvpModeByInvitation = new Map<string, string>();
    for (const r of ((invitationRows ?? []) as any[])) {
      const rsvps = Array.isArray(r.rsvps) ? r.rsvps : r.rsvps ? [r.rsvps] : [];
      rsvpStatusByInvitation.set(r.id as string, (rsvps[0]?.status as string | undefined) ?? "none");
      rsvpModeByInvitation.set(r.id as string, (rsvps[0]?.attendance_mode as string | undefined) ?? "none");
    }
    const ledgerByKey = new Map(
      ledger.rows.map((row) => [`${row.id}::${row.cuisine}`, row] as const),
    );
    const allLedgerByKey = new Map(
      allLedger.rows.map((row) => [`${row.id}::${row.cuisine}`, row] as const),
    );
    const rows: MealTextRow[] = [];
    const excluded: MealTextExcludedRow[] = [];
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
        if (!ledgerRow) {
          // Kept, never deleted: the order exists but is outside the payment
          // chase (RSVP "no", Zoom attendance, or no RSVP at all). Read-only.
          const status = p.invitation_id
            ? (rsvpStatusByInvitation.get(p.invitation_id) ?? "none")
            : "none";
          const mode = p.invitation_id
            ? (rsvpModeByInvitation.get(p.invitation_id) ?? "none")
            : "none";
          excluded.push({
            id: p.id,
            name: (p.name ?? "").trim() || "Guest",
            phone: (p.phone ?? "").trim(),
            cuisine,
            qty,
            inviter: inviterName,
            rsvp_status: status,
            attendance_mode: mode,
            reason: !p.invitation_id
              ? "Meal on file but not linked to any invitation."
              : status === "none"
                ? "Meal on file but this guest has no RSVP record."
                : status === "no"
                  ? "Meal on file while the RSVP is a decline (no)."
                  : mode === "zoom"
                    ? "Meal on file but this guest is attending on Zoom, not in person."
                    : `Meal on file while the RSVP is "${status}" (${mode}).`,
            sent_at: sentByMeal.get(`${p.id}::${cuisine}`) ?? null,
            zelle_sent_at: zelleByMeal.get(`${p.id}::${cuisine}`) ?? null,
            paid: isPaidState(allLedgerByKey.get(`${p.id}::${cuisine}`)?.state),
          });
          continue;
        }
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

    const { buildMealInstructionQueue, reconcileExplicitTextBatch } = await import("@/lib/meal-instruction-queue");
    const batchReconciliation = reconcileExplicitTextBatch(rows, (textEvents ?? []) as any[]);

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
      excluded,
      orphanMarks,

      instructionQueue: buildMealInstructionQueue(
        rows,
        instructionEvidence.lines,
        batchReconciliation.reconstructed_contact_ids,
      ) as MealInstructionQueueContact[],
      batchReconciliation: batchReconciliation as MealTextBatchReconciliation,
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
      isAdmin: staff.isAdmin,
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
