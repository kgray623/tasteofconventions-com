import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type {
  CommitteeMealTextRow,
  CommitteeMealTextsResult,
} from "@/lib/committee-meal-texts.server";

export const getMyMealTexts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        actingForInviterId: z.string().uuid().nullable().optional(),
        // "all" is honoured for admins only (enforced server-side).
        scope: z.enum(["mine", "all"]).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { loadCommitteeMealTexts } = await import("@/lib/committee-meal-texts.server");
    return loadCommitteeMealTexts(
      context.supabase,
      context.userId,
      data.actingForInviterId ?? null,
      { scope: data.scope ?? "mine" },
    );
  });


export const markMyMealTextSent = createServerFn({ method: "POST" })
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
        actingForInviterId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )

  .handler(async ({ data, context }) => {
    const { loadCommitteeMealTexts, resolveIdentity } = await import(
      "@/lib/committee-meal-texts.server"
    );
    const identity = await resolveIdentity(context.supabase, context.userId);

    if (!identity.isStaff) {
      // Committee members may only mark their own guests' meals.
      const allowed = await loadCommitteeMealTexts(context.supabase, context.userId, null);
      const mine = new Set(allowed.rows.map((r) => `${r.id}::${r.cuisine}`));
      if (data.marks.some((m) => !mine.has(`${m.preorderId}::${m.cuisine}`)))
        throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { appendMealTextEvents } = await import("@/lib/meal-text-tracking.server");
    return appendMealTextEvents(supabaseAdmin, {
      campaign: "original",
      marks: data.marks,
      sent: data.sent,
      actorId: context.userId,
    });
  });


/** Zelle/Venmo follow-up mark for a committee member's own guests. */
export const markMyZelleTextSent = createServerFn({ method: "POST" })
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
        actingForInviterId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { loadCommitteeMealTexts, resolveIdentity } = await import(
      "@/lib/committee-meal-texts.server"
    );
    const identity = await resolveIdentity(context.supabase, context.userId);

    if (!identity.isStaff) {
      const allowed = await loadCommitteeMealTexts(context.supabase, context.userId, null);
      const mine = new Set(allowed.rows.map((r) => `${r.id}::${r.cuisine}`));
      if (data.marks.some((m) => !mine.has(`${m.preorderId}::${m.cuisine}`)))
        throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { appendMealTextEvents } = await import("@/lib/meal-text-tracking.server");
    return appendMealTextEvents(supabaseAdmin, {
      campaign: "payment_update",
      marks: data.marks,
      sent: data.sent,
      actorId: context.userId,
    });
  });
