import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type {
  CoveredDishGuest,
  CoveredDishGroup,
  CoveredDishResult,
} from "@/lib/covered-dish.server";

/** Guests coming in person with no catered meal, grouped by committee member. */
export const getCoveredDishList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadCoveredDishList } = await import("@/lib/covered-dish.server");
    return loadCoveredDishList(context.supabase, context.userId);
  });

/** Save the covered-dish reminder wording (admin/committee only). */
export const saveCoveredDishTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ template: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert(
      {
        key: "covered_dish_text_template",
        value: data.template,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
