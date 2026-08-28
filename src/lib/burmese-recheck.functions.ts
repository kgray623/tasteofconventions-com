import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type {
  BurmeseRecheckGuest,
  BurmeseRecheckGroup,
  BurmeseRecheckResult,
} from "@/lib/burmese-recheck.server";

/** The 34 households the Burmese restaurant reports as unpaid on his end. */
export const getBurmeseRecheckList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadBurmeseRecheckList } = await import("@/lib/burmese-recheck.server");
    return loadBurmeseRecheckList(context.supabase, context.userId);
  });

/** Save the recheck text wording (admin/committee only). */
export const saveBurmeseRecheckTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ template: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
    const { BURMESE_RECHECK_TEMPLATE_KEY } = await import("@/lib/burmese-recheck-roster");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert(
      {
        key: BURMESE_RECHECK_TEMPLATE_KEY,
        value: data.template,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Manual "I sent that text" mark — only ever set by an explicit human action. */
export const setBurmeseRecheckTextSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        phoneNormalized: z.string().min(7).max(20),
        guestName: z.string().max(200).optional(),
        invitationId: z.string().uuid().nullable().optional(),
        sent: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { markBurmeseRecheckTextSent } = await import("@/lib/burmese-recheck.server");
    return markBurmeseRecheckTextSent(context.supabase, context.userId, data);
  });
