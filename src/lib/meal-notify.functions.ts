import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export type { MealNotifyInviter } from "@/lib/meal-notify.server";
export type { MealTextLedgerSummary, CommitteeMealAuditRow } from "@/lib/meal-notify.server";
export type { MealCommunicationRow, MealCommunicationTotals } from "@/lib/meal-communication";
import type { MealCommunicationRow, MealCommunicationTotals } from "@/lib/meal-communication";
import type { MealNotifyInviter } from "@/lib/meal-notify.server";
import type { MealTextLedgerSummary, CommitteeMealAuditRow } from "@/lib/meal-notify.server";

export type MealNotifyRollup = {
  rows: MealCommunicationRow[];
  totals: MealCommunicationTotals;
  inviters: MealNotifyInviter[];
  generated_at: string;
  text_accounting: MealTextLedgerSummary;
  committee_orders: CommitteeMealAuditRow[];
  committee_totals: { members: number; active_orderers: number; no_order: number; order_lines: number; plates: number };
};

/**
 * Live rollup of who still needs a pre-pay text, grouped by the committee
 * member who owns the guest. Derived on every call from the database so it can
 * never drift; "notified" only ever reflects an explicit human check.
 */
export const getMealNotifyRollup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "team"]);
    if (!roles?.length) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadMealNotifyRollup } = await import("@/lib/meal-notify.server");
    return loadMealNotifyRollup(supabaseAdmin);
  });
