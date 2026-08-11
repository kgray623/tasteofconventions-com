// Thin server-function wrappers for catered-meal payment reporting.
// Module scope holds only imports, types, and server-function declarations.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ReportInput = z.object({
  token: z.string().min(4),
  cuisine: z.string().min(2).max(60),
  qty: z.number().int().min(1).max(20).default(1),
  method: z.enum(["zelle", "venmo", "cash", "card", "other"]).default("zelle"),
  note: z.string().max(500).optional(),
});

const CommitteeInput = z.object({
  preorder_id: z.string().uuid(),
  cuisine: z.string().min(2).max(60),
  qty: z.number().int().min(1).max(20).default(1),
  method: z.enum(["zelle", "venmo", "cash", "card", "other"]).default("zelle"),
  note: z.string().max(500).optional(),
});

/**
 * A guest tells us they paid the restaurant directly (e.g. Zelle without a
 * memo). Authenticated by their RSVP token, exactly like RSVP submission.
 */
export const reportMyMealPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordMealPayment } = await import("@/lib/meal-payments.server");
    const { rsvpTokenCandidates } = await import("@/lib/rsvp-token");

    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_phone")
      .in("rsvp_token", rsvpTokenCandidates(data.token))
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Invitation not found");

    const { data: preorder, error: pErr } = await supabaseAdmin
      .from("cuisine_preorders")
      .select("id")
      .eq("invitation_id", inv.id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!preorder) throw new Error("No catered meal order was found for you.");

    return recordMealPayment(supabaseAdmin, {
      preorder_id: preorder.id,
      cuisine: data.cuisine,
      qty: data.qty,
      method: data.method,
      note: data.note ?? null,
      source: "guest_reported",
      reported_by: null,
      reported_by_label: inv.guest_name ?? null,
      paid_at: new Date().toISOString(),
    });
  });

/**
 * A committee member or admin records a payment a guest told them about.
 * The admin (service-role) client is only loaded AFTER the caller's admin/team
 * role is verified against their own RLS-scoped client.
 */
export const recordMealPaymentForGuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CommitteeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { recordMealPayment, assertMealPaymentStaff } = await import(
      "@/lib/meal-payments.server"
    );

    // Authorization first: being signed in is not enough.
    await assertMealPaymentStaff(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();

    return recordMealPayment(supabaseAdmin, {
      preorder_id: data.preorder_id,
      cuisine: data.cuisine,
      qty: data.qty,
      method: data.method,
      note: data.note ?? null,
      source: "committee_recorded",
      reported_by: context.userId,
      reported_by_label: profile?.display_name ?? null,
      paid_at: new Date().toISOString(),
    });
  });

/**
 * Reported payments the restaurant has not confirmed yet. This roster contains
 * other guests' names, phones, and notes, so admin/team role is required before
 * the service-role client is used.
 */
export const listMealPaymentsToVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listReportedMealPayments, assertMealPaymentStaff } = await import(
      "@/lib/meal-payments.server"
    );
    await assertMealPaymentStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return listReportedMealPayments(supabaseAdmin);
  });
