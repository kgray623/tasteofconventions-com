import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Meal preordering is closed. A guest may still request a plate, but ONLY after
 * they report that they have already paid the restaurant directly. A row is
 * created in public.meal_waiting_list only when payment is reported — never
 * otherwise. Nothing in the existing preorder/payment tables is touched.
 */
export const requestMealWaitingList = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: z.string().trim().min(1).max(200).optional(),
        name: z.string().trim().min(1).max(120),
        phone: z.string().trim().min(7).max(40),
        cuisine: z.string().trim().min(1).max(80),
        qty: z.number().int().min(1).max(20),
        payment_method: z.enum(["zelle", "venmo", "cash", "card", "other"]),
        payment_note: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const digits = data.phone.replace(/\D/g, "");
    if (digits.length < 7) throw new Error("Enter a valid mobile number.");

    let invitationId: string | null = null;
    if (data.token) {
      const { data: inv } = await supabaseAdmin
        .from("invitations")
        .select("id")
        .eq("rsvp_token", data.token)
        .maybeSingle();
      invitationId = inv?.id ?? null;
    }
    if (!invitationId) {
      const candidates = Array.from(
        new Set([
          digits,
          digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits,
          digits.length === 10 ? `1${digits}` : digits,
        ]),
      );
      const { data: inv } = await supabaseAdmin
        .from("invitations")
        .select("id")
        .in("guest_phone_normalized", candidates)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      invitationId = inv?.id ?? null;
    }

    const now = new Date().toISOString();
    const { data: row, error } = await supabaseAdmin
      .from("meal_waiting_list")
      .insert({
        name: data.name.slice(0, 120),
        phone: data.phone.slice(0, 40),
        invitation_id: invitationId,
        cuisine: data.cuisine,
        qty: data.qty,
        payment_method: data.payment_method,
        payment_reported_at: now,
        payment_note: data.payment_note?.slice(0, 500) || null,
      })
      .select("id,cuisine,qty,status")
      .single();
    if (error) {
      console.error("[meal-waiting-list] insert failed:", error.message);
      throw new Error("Could not save your request. Please try again.");
    }
    return row;
  });
