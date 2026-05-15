import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public lookup of an invitation by RSVP token (used on the guest magic-link page)
export const getInvitationByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(8).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .select("id,event_id,guest_name,guest_email,notes,events(title,description,starts_at,ends_at,location,virtual_link)")
      .eq("rsvp_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { invitation: null, rsvp: null, order: null };
    const { data: rsvp } = await supabaseAdmin.from("rsvps").select("*").eq("invitation_id", inv.id).maybeSingle();
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("invitation_id", inv.id).maybeSingle();
    return { invitation: inv, rsvp, order };
  });

const RsvpInput = z.object({
  token: z.string().min(8).max(120),
  status: z.enum(["yes", "no", "maybe"]),
  party_size: z.number().int().min(1).max(20),
  dietary_notes: z.string().max(500).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
});

export const submitRsvp = createServerFn({ method: "POST" })
  .inputValidator((d) => RsvpInput.parse(d))
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin
      .from("invitations").select("id").eq("rsvp_token", data.token).maybeSingle();
    if (!inv) throw new Error("Invitation not found");
    const { error } = await supabaseAdmin.from("rsvps").upsert({
      invitation_id: inv.id,
      status: data.status,
      party_size: data.party_size,
      dietary_notes: data.dietary_notes ?? null,
      message: data.message ?? null,
      responded_at: new Date().toISOString(),
    }, { onConflict: "invitation_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const OrderInput = z.object({
  token: z.string().min(8).max(120),
  restaurant_id: z.string().uuid(),
  items: z.array(z.object({
    menu_item_id: z.string().uuid(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().int().min(1).max(10),
  })).min(1).max(20),
  notes: z.string().max(500).optional().nullable(),
});

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => OrderInput.parse(d))
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin
      .from("invitations").select("id").eq("rsvp_token", data.token).maybeSingle();
    if (!inv) throw new Error("Invitation not found");
    const total = data.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const { error } = await supabaseAdmin.from("orders").upsert({
      invitation_id: inv.id,
      restaurant_id: data.restaurant_id,
      items: data.items,
      total,
      notes: data.notes ?? null,
    }, { onConflict: "invitation_id" });
    if (error) throw new Error(error.message);
    return { ok: true, total };
  });
