// Thin server-function wrappers for committee follow-up notes on unpaid meals.
// Module scope holds only imports, types, and server-function declarations.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type {
  MealFollowUpNote,
  MealFollowUpNoteInput,
} from "@/lib/meal-follow-up-notes.server";

const SaveNoteInput = z.object({
  preorder_id: z.string().uuid(),
  cuisine: z.string().min(2).max(80),
  invitation_id: z.string().uuid().nullable().optional(),
  note: z.string().min(1).max(500),
});

/**
 * All committee follow-up notes. Visible to admins and team members only.
 * Notes are read through the admin client so the returned roster is complete
 * and can be keyed by `preorder_id::cuisine` in the UI.
 */
export const listMealFollowUpNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertMealPaymentStaff } = await import("@/lib/meal-payments.server");
    const { listMealFollowUpNotes } = await import("@/lib/meal-follow-up-notes.server");
    await assertMealPaymentStaff(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return listMealFollowUpNotes(supabaseAdmin);
  });

/**
 * Add or update a single note for a guest's unpaid meal. Admins and team members
 * only; a committee member may only add a note for a guest on their own list.
 */
export const saveMealFollowUpNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveNoteInput.parse(d))
  .handler(async ({ data, context }) => {
    const {
      assertMealPaymentStaff,
      assertCanRecordPaymentForPreorder,
    } = await import("@/lib/meal-payments.server");
    const { saveMealFollowUpNote } = await import("@/lib/meal-follow-up-notes.server");

    const { isAdmin } = await assertMealPaymentStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await assertCanRecordPaymentForPreorder(
      supabaseAdmin,
      context.userId,
      data.preorder_id,
      isAdmin,
    );

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();

    return saveMealFollowUpNote(supabaseAdmin, {
      preorder_id: data.preorder_id,
      cuisine: data.cuisine,
      invitation_id: data.invitation_id ?? null,
      note: data.note,
    }, {
      user_id: context.userId,
      label: profile?.display_name ?? null,
    });
  });
