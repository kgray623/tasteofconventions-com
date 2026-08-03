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
        ids: z.array(z.string().uuid()).min(1).max(500),
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
      // Committee members may only mark their own guests' pre-orders.
      const allowed = await loadCommitteeMealTexts(context.supabase, context.userId, null);
      const mineIds = new Set(allowed.rows.map((r) => r.id));
      if (data.ids.some((id) => !mineIds.has(id))) throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sentAt = data.sent ? new Date().toISOString() : null;
    const { error } = await supabaseAdmin
      .from("cuisine_preorders")
      .update({ meal_text_sent_at: sentAt })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, sentAt };
  });
