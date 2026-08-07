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
      .object({ actingForInviterId: z.string().uuid().nullable().optional() })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { loadCommitteeMealTexts } = await import("@/lib/committee-meal-texts.server");
    return loadCommitteeMealTexts(
      context.supabase,
      context.userId,
      data.actingForInviterId ?? null,
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
          .max(500),
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

